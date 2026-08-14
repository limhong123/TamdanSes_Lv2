from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from sqlalchemy.orm import Session

from app.database.db import get_db

from app.models.user import User
from app.models.notification import Notification
from app.models.parent import Parent
from app.models.parent_student import ParentStudent
from app.models.student import Student

from app.schemas.notification_schema import (
    FCMTokenSchema,
    SendNotificationSchema,
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse,
)

from app.core.security import get_current_user

from app.services.notification_service import (
    send_push_notification,
)


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# ============================================================
# HELPER
#
# Return all user IDs whose notifications
# the current login user is allowed to see.
#
# Student:
#   [current_user.id]
#
# Parent:
#   [
#       parent_user_id,
#       child_1_user_id,
#       child_2_user_id,
#       ...
#   ]
# ============================================================

def get_allowed_notification_user_ids(
    current_user: User,
    db: Session,
) -> list[int]:
    # ========================================================
    # NORMAL USER / STUDENT
    # ========================================================

    if current_user.role != "parent":
        return [
            current_user.id,
        ]

    # ========================================================
    # FIND PARENT PROFILE
    # ========================================================

    parent = (
        db.query(Parent)
        .filter(
            Parent.user_id == current_user.id
        )
        .first()
    )

    # Parent profile not found.
    # Still allow parent to see own notifications.
    if not parent:
        return [
            current_user.id,
        ]

    # ========================================================
    # FIND LINKED STUDENTS
    # ========================================================

    relations = (
        db.query(ParentStudent)
        .filter(
            ParentStudent.parent_id == parent.id
        )
        .all()
    )

    student_ids = [
        relation.student_id
        for relation in relations
    ]

    # No linked children.
    if not student_ids:
        return [
            current_user.id,
        ]

    # ========================================================
    # FIND STUDENT USER IDS
    #
    # IMPORTANT:
    # Notification.user_id points to users.id,
    # not students.id.
    # ========================================================

    students = (
        db.query(Student)
        .filter(
            Student.id.in_(student_ids)
        )
        .all()
    )

    child_user_ids = [
        student.user_id
        for student in students
        if student.user_id is not None
    ]

    # ========================================================
    # PARENT + CHILDREN
    # ========================================================

    return [
        current_user.id,
        *child_user_ids,
    ]


# ============================================================
# GET NOTIFICATIONS
#
# Student:
#   only own notifications
#
# Parent:
#   own + linked children's notifications
# ============================================================

@router.get(
    "",
    response_model=list[NotificationResponse],
)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed_user_ids = (
        get_allowed_notification_user_ids(
            current_user=current_user,
            db=db,
        )
    )

    notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id.in_(
                allowed_user_ids
            )
        )
        .order_by(
            Notification.id.desc()
        )
        .all()
    )

    return notifications


# ============================================================
# CREATE NOTIFICATION
# ============================================================

@router.post(
    "",
    response_model=NotificationResponse,
)
def create_notification(
    data: NotificationCreate,
    db: Session = Depends(get_db),
):
    # ========================================================
    # CHECK USER
    # ========================================================

    user = (
        db.query(User)
        .filter(
            User.id == data.user_id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # ========================================================
    # CREATE
    # ========================================================

    notification = Notification(
        user_id=data.user_id,
        title=data.title,
        message=data.message,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


# ============================================================
# UPDATE NOTIFICATION
#
# Student:
#   can update own notification
#
# Parent:
#   can update own or linked child's notification
# ============================================================

@router.put(
    "/{notification_id}",
    response_model=NotificationResponse,
)
def update_notification(
    notification_id: int,
    data: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed_user_ids = (
        get_allowed_notification_user_ids(
            current_user=current_user,
            db=db,
        )
    )

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id.in_(
                allowed_user_ids
            ),
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    notification.title = data.title
    notification.message = data.message

    db.commit()
    db.refresh(notification)

    return notification


# ============================================================
# DELETE NOTIFICATION
#
# Student:
#   can delete own notification
#
# Parent:
#   can delete own or linked child's notification
# ============================================================

@router.delete(
    "/{notification_id}",
)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed_user_ids = (
        get_allowed_notification_user_ids(
            current_user=current_user,
            db=db,
        )
    )

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id.in_(
                allowed_user_ids
            ),
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    db.delete(notification)
    db.commit()

    return {
        "message": "Notification deleted",
    }


# ============================================================
# SAVE FCM TOKEN
#
# A device token should belong to one user only.
# ============================================================

@router.post(
    "/fcm-token",
)
def save_fcm_token(
    data: FCMTokenSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ========================================================
    # REMOVE SAME TOKEN FROM OTHER USERS
    # ========================================================

    (
        db.query(User)
        .filter(
            User.fcm_token == data.token,
            User.id != current_user.id,
        )
        .update(
            {
                User.fcm_token: None,
            },
            synchronize_session=False,
        )
    )

    # ========================================================
    # SAVE TOKEN TO CURRENT USER
    # ========================================================

    current_user.fcm_token = data.token

    db.commit()

    return {
        "message": "FCM token saved",
    }


# ============================================================
# REMOVE FCM TOKEN ON LOGOUT
# ============================================================

@router.delete(
    "/fcm-token",
)
def delete_fcm_token(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.fcm_token = None

    db.commit()

    return {
        "message": "FCM token removed",
    }


# ============================================================
# SEND PUSH NOTIFICATION
# ============================================================

@router.post(
    "/send",
)
def send_notification(
    data: SendNotificationSchema,
    db: Session = Depends(get_db),
):
    # ========================================================
    # FIND USER
    # ========================================================

    user = (
        db.query(User)
        .filter(
            User.id == data.user_id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # ========================================================
    # CHECK FCM TOKEN
    # ========================================================

    if not user.fcm_token:
        raise HTTPException(
            status_code=400,
            detail="User has no FCM token",
        )

    # ========================================================
    # SEND FIREBASE PUSH
    # ========================================================

    response = send_push_notification(
        token=user.fcm_token,
        title=data.title,
        body=data.body,
    )

    return {
        "message": "Notification sent",
        "firebase_response": response,
    }