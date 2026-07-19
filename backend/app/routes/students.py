import secrets
import string

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.db import get_db
from app.models.parent import Parent
from app.models.parent_student import ParentStudent
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.models.user import User
from app.schemas.student_schema import StudentCreate


router = APIRouter(
    prefix="/students",
    tags=["Students"],
)


# =========================================================
# Helper functions
# =========================================================

def generate_password(length: int = 8) -> str:
    """
    Generate a random temporary password.
    """

    characters = string.ascii_letters + string.digits

    return "".join(
        secrets.choice(characters)
        for _ in range(length)
    )


def normalize_phone(phone: str | None) -> str | None:
    """
    Convert Cambodian phone number to +855 format.

    Examples:
        012345678     -> +85512345678
        85512345678   -> +85512345678
        +85512345678  -> +85512345678
    """

    if not phone:
        return None

    phone = (
        phone.strip()
        .replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )

    if phone.startswith("+855"):
        return phone

    if phone.startswith("855"):
        return f"+{phone}"

    if phone.startswith("0"):
        return f"+855{phone[1:]}"

    return phone


def split_full_name(full_name: str | None) -> tuple[str, str]:
    """
    Split guardian full name for User.first_name and User.last_name.
    """

    if not full_name or not full_name.strip():
        return "Parent", "Guardian"

    parts = full_name.strip().split()

    if len(parts) == 1:
        return parts[0], "Guardian"

    first_name = parts[0]
    last_name = " ".join(parts[1:])

    return first_name, last_name


def make_parent_email(
    phone: str,
    db: Session,
) -> str:
    """
    Generate a unique internal email for parent.

    Parent logs in using Student ID + Phone + OTP,
    but User.email cannot be null in your users table.
    """

    phone_digits = "".join(
        character
        for character in phone
        if character.isdigit()
    )

    base_email = f"parent{phone_digits}@tamdansers.com"
    parent_email = base_email
    counter = 1

    while (
        db.query(User)
        .filter(User.email == parent_email)
        .first()
    ):
        parent_email = (
            f"parent{phone_digits}{counter}"
            f"@tamdansers.com"
        )
        counter += 1

    return parent_email


def student_response(
    student: Student,
    db: Session,
):
    user = (
        db.query(User)
        .filter(User.id == student.user_id)
        .first()
    )

    school_class = (
        db.query(SchoolClass)
        .filter(SchoolClass.id == student.class_id)
        .first()
    )

    parent_relation = (
        db.query(ParentStudent)
        .filter(ParentStudent.student_id == student.id)
        .first()
    )

    parent = None

    if parent_relation:
        parent = (
            db.query(Parent)
            .filter(Parent.id == parent_relation.parent_id)
            .first()
        )

    return {
        "id": student.id,
        "student_code": student.student_code,
        "user_id": student.user_id,

        "first_name": user.first_name if user else "",
        "last_name": user.last_name if user else "",
        "student_name": (
            f"{user.first_name} {user.last_name}"
            if user
            else "-"
        ),
        "email": user.email if user else "",
        "phone": user.phone if user else "",

        "class_id": student.class_id,
        "class_name": (
            f"{school_class.name} "
            f"{school_class.section or ''}"
        ).strip()
        if school_class
        else "-",

        "gender": student.gender,
        "guardian_name": student.guardian_name,
        "guardian_phone": student.guardian_phone,
        "address": student.address,

        "parent_id": parent.id if parent else None,
        "parent_name": (
            parent.full_name
            if parent
            else student.guardian_name
        ),
        "parent_phone": (
            parent.phone
            if parent
            else student.guardian_phone
        ),
        "parent_relationship": (
            parent_relation.relationship_type
            if parent_relation
            else None
        ),
    }


def get_or_create_parent(
    guardian_name: str,
    guardian_phone: str,
    db: Session,
) -> tuple[Parent, str | None]:
    """
    Find parent using phone.

    If parent does not exist:
    - Create User role parent
    - Create Parent profile

    Returns:
        parent
        temporary password, only when newly created
    """

    normalized_phone = normalize_phone(guardian_phone)

    if not normalized_phone:
        raise HTTPException(
            status_code=400,
            detail="Guardian phone is required",
        )

    existing_parent = (
        db.query(Parent)
        .filter(Parent.phone == normalized_phone)
        .first()
    )

    if existing_parent:
        return existing_parent, None

    existing_user_with_phone = (
        db.query(User)
        .filter(User.phone == normalized_phone)
        .first()
    )

    if existing_user_with_phone:
        if existing_user_with_phone.role != "parent":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Guardian phone is already used by "
                    "another user account"
                ),
            )

        parent = (
            db.query(Parent)
            .filter(
                Parent.user_id
                == existing_user_with_phone.id
            )
            .first()
        )

        if parent:
            return parent, None

        parent = Parent(
            user_id=existing_user_with_phone.id,
            full_name=guardian_name.strip(),
            phone=normalized_phone,
        )

        db.add(parent)
        db.flush()

        return parent, None

    first_name, last_name = split_full_name(
        guardian_name
    )

    parent_password = generate_password()

    parent_user = User(
        first_name=first_name,
        last_name=last_name,
        email=make_parent_email(
            normalized_phone,
            db,
        ),
        password=hash_password(parent_password),
        phone=normalized_phone,
        role="parent",
        is_active=True,
    )

    db.add(parent_user)
    db.flush()

    parent = Parent(
        user_id=parent_user.id,
        full_name=guardian_name.strip(),
        phone=normalized_phone,
    )

    db.add(parent)
    db.flush()

    return parent, parent_password


def connect_parent_to_student(
    parent: Parent,
    student: Student,
    db: Session,
) -> ParentStudent:
    """
    Connect parent with student.

    Does not create duplicate relation.
    """

    existing_relation = (
        db.query(ParentStudent)
        .filter(
            ParentStudent.parent_id == parent.id,
            ParentStudent.student_id == student.id,
        )
        .first()
    )

    if existing_relation:
        return existing_relation

    relation = ParentStudent(
        parent_id=parent.id,
        student_id=student.id,
        relationship_type="guardian",
    )

    db.add(relation)
    db.flush()

    return relation


# =========================================================
# Get all students
# =========================================================

@router.get("/")
def get_students(
    db: Session = Depends(get_db),
):
    students = db.query(Student).all()

    return [
        student_response(student, db)
        for student in students
    ]


# =========================================================
# Get student detail
# =========================================================

@router.get("/{student_id}")
def get_student_detail(
    student_id: int,
    db: Session = Depends(get_db),
):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    return student_response(student, db)


# =========================================================
# Create student and parent
# =========================================================

@router.post("/")
def create_student(
    data: StudentCreate,
    db: Session = Depends(get_db),
):
    normalized_student_phone = normalize_phone(
        data.phone
    )

    normalized_guardian_phone = normalize_phone(
        data.guardian_phone
    )

    if not data.guardian_name:
        raise HTTPException(
            status_code=400,
            detail="Guardian name is required",
        )

    if not normalized_guardian_phone:
        raise HTTPException(
            status_code=400,
            detail="Guardian phone is required",
        )

    school_class = (
        db.query(SchoolClass)
        .filter(SchoolClass.id == data.class_id)
        .first()
    )

    if not school_class:
        raise HTTPException(
            status_code=404,
            detail="Class not found",
        )

    try:
        # ---------------------------------------------
        # Generate student code
        # ---------------------------------------------

        last_student = (
            db.query(Student)
            .order_by(Student.id.desc())
            .first()
        )

        next_number = (
            last_student.id + 1
            if last_student
            else 1
        )

        student_code = f"ST-{next_number:04d}"

        while (
            db.query(Student)
            .filter(
                Student.student_code == student_code
            )
            .first()
        ):
            next_number += 1
            student_code = f"ST-{next_number:04d}"

        # ---------------------------------------------
        # Generate student email
        # ---------------------------------------------

        base_email = (
            data.last_name
            .lower()
            .strip()
            .replace(" ", "")
        )

        if not base_email:
            base_email = "student"

        auto_email = (
            data.email.strip().lower()
            if data.email
            else f"{base_email}@gmail.com"
        )

        counter = 1

        while (
            db.query(User)
            .filter(User.email == auto_email)
            .first()
        ):
            auto_email = (
                f"{base_email}{counter}@gmail.com"
            )
            counter += 1

        auto_password = (
            data.password
            if data.password
            else generate_password()
        )

        # ---------------------------------------------
        # Create student user
        # ---------------------------------------------

        student_user = User(
            first_name=data.first_name.strip(),
            last_name=data.last_name.strip(),
            email=auto_email,
            password=hash_password(auto_password),
            phone=normalized_student_phone,
            role="student",
            is_active=True,
        )

        db.add(student_user)
        db.flush()

        # ---------------------------------------------
        # Create student profile
        # ---------------------------------------------

        student = Student(
            student_code=student_code,
            user_id=student_user.id,
            class_id=data.class_id,
            gender=data.gender,
            guardian_name=data.guardian_name.strip(),
            guardian_phone=normalized_guardian_phone,
            address=data.address,
        )

        db.add(student)
        db.flush()

        # ---------------------------------------------
        # Find or create parent
        # ---------------------------------------------

        parent, parent_temporary_password = (
            get_or_create_parent(
                guardian_name=data.guardian_name,
                guardian_phone=normalized_guardian_phone,
                db=db,
            )
        )

        # ---------------------------------------------
        # Connect parent with student
        # ---------------------------------------------

        relation = connect_parent_to_student(
            parent=parent,
            student=student,
            db=db,
        )

        db.commit()
        db.refresh(student)
        db.refresh(parent)

        result = student_response(
            student,
            db,
        )

        result["login_id"] = student_code
        result["default_password"] = auto_password

        result["parent"] = {
            "id": parent.id,
            "name": parent.full_name,
            "phone": parent.phone,
            "role": "parent",
            "relationship_type": (
                relation.relationship_type
            ),
            "temporary_password": (
                parent_temporary_password
            ),
            "login_method": (
                "Student ID + Parent Phone + OTP"
            ),
        }

        return result

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()

        print(
            "Create student error:",
            str(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to create student",
        )


# =========================================================
# Reset student password
# =========================================================

@router.post("/{student_id}/reset-password")
def reset_student_password(
    student_id: int,
    db: Session = Depends(get_db),
):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    user = (
        db.query(User)
        .filter(User.id == student.user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    new_password = generate_password()

    user.password = hash_password(new_password)

    db.commit()
    db.refresh(user)

    return {
        "student_code": student.student_code,
        "email": user.email,
        "temporary_password": new_password,
    }


# =========================================================
# Update student and parent relation
# =========================================================

@router.put("/{student_id}")
def update_student(
    student_id: int,
    data: StudentCreate,
    db: Session = Depends(get_db),
):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    user = (
        db.query(User)
        .filter(User.id == student.user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    school_class = (
        db.query(SchoolClass)
        .filter(SchoolClass.id == data.class_id)
        .first()
    )

    if not school_class:
        raise HTTPException(
            status_code=404,
            detail="Class not found",
        )

    normalized_student_phone = normalize_phone(
        data.phone
    )

    normalized_guardian_phone = normalize_phone(
        data.guardian_phone
    )

    if not normalized_guardian_phone:
        raise HTTPException(
            status_code=400,
            detail="Guardian phone is required",
        )

    try:
        # ---------------------------------------------
        # Update student user
        # ---------------------------------------------

        user.first_name = data.first_name.strip()
        user.last_name = data.last_name.strip()

        if data.email:
            new_email = data.email.strip().lower()

            existing_email = (
                db.query(User)
                .filter(
                    User.email == new_email,
                    User.id != user.id,
                )
                .first()
            )

            if existing_email:
                raise HTTPException(
                    status_code=400,
                    detail="Email already exists",
                )

            user.email = new_email

        user.phone = normalized_student_phone

        if data.password:
            user.password = hash_password(
                data.password
            )

        # ---------------------------------------------
        # Update student profile
        # ---------------------------------------------

        student.class_id = data.class_id
        student.gender = data.gender
        student.guardian_name = (
            data.guardian_name.strip()
        )
        student.guardian_phone = (
            normalized_guardian_phone
        )
        student.address = data.address

        db.flush()

        # ---------------------------------------------
        # Find or create new parent
        # ---------------------------------------------

        parent, _ = get_or_create_parent(
            guardian_name=data.guardian_name,
            guardian_phone=normalized_guardian_phone,
            db=db,
        )

        # ---------------------------------------------
        # Find current parent relation
        # ---------------------------------------------

        old_relations = (
            db.query(ParentStudent)
            .filter(
                ParentStudent.student_id
                == student.id
            )
            .all()
        )

        relation_exists = False

        for relation in old_relations:
            if relation.parent_id == parent.id:
                relation_exists = True
            else:
                db.delete(relation)

        if not relation_exists:
            connect_parent_to_student(
                parent=parent,
                student=student,
                db=db,
            )

        db.commit()
        db.refresh(student)

        return student_response(
            student,
            db,
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()

        print(
            "Update student error:",
            str(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to update student",
        )


# =========================================================
# Delete student
# =========================================================

@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    student_user = (
        db.query(User)
        .filter(User.id == student.user_id)
        .first()
    )

    try:
        # Get parent relations before deleting student
        parent_relations = (
            db.query(ParentStudent)
            .filter(
                ParentStudent.student_id
                == student.id
            )
            .all()
        )

        parent_ids = [
            relation.parent_id
            for relation in parent_relations
        ]

        # Delete parent-student relations
        for relation in parent_relations:
            db.delete(relation)

        db.flush()

        # Delete student profile
        db.delete(student)
        db.flush()

        # Delete student user
        if student_user:
            db.delete(student_user)

        db.flush()

        # Delete parent only when parent has no more children
        for parent_id in parent_ids:
            remaining_relation = (
                db.query(ParentStudent)
                .filter(
                    ParentStudent.parent_id
                    == parent_id
                )
                .first()
            )

            if not remaining_relation:
                parent = (
                    db.query(Parent)
                    .filter(Parent.id == parent_id)
                    .first()
                )

                if parent:
                    parent_user = (
                        db.query(User)
                        .filter(
                            User.id == parent.user_id
                        )
                        .first()
                    )

                    db.delete(parent)
                    db.flush()

                    if parent_user:
                        db.delete(parent_user)

        db.commit()

        return {
            "message": "Student deleted successfully",
        }

    except Exception as error:
        db.rollback()

        print(
            "Delete student error:",
            str(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to delete student",
        )