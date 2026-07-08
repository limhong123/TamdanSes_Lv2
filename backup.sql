--
-- PostgreSQL database dump
--

\restrict H6uaO3dK34eH0p1Jt4KdAJ53VaKS1vV9ipRxpQcQvR5EOTaD6eU7gzGAnWsOflV

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-07-07 10:36:32

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5154 (class 0 OID 16407)
-- Dependencies: 222
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subjects (id, name, code, class_id, teacher_id) FROM stdin;
1	Khmer	001	\N	\N
2	Math	002	\N	\N
\.


--
-- TOC entry 5152 (class 0 OID 16390)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, first_name, last_name, avatar_url, email, password, role, is_active, phone, telegram_chat_id, reset_otp, reset_otp_expire, fcm_token) FROM stdin;
10	koko	dodo	\N	dodo@gmail.com	$2b$12$EEK6jUcA4MAki5PCejwp5uHxhpFiLmRww9.5wzPXviIevQvUgwXmC	student	t	+85592392393	\N	\N	\N	\N
3	Run	LimhongGd	https://res.cloudinary.com/dkn5zii0b/image/upload/v1781487606/tamdan/avatars/ekxxlb2slmgnnkkrg6cn.jpg	student1@gmail.com	$2b$12$voWWE2F292iY4vXW8UI1fOhvCGsvQUM7iQutziz3xWNmXVjxWtPaS	student	t	+85566968050	1462815899	867183	2026-06-11 08:33:16.10599	\N
2	Phon	Phe	https://res.cloudinary.com/dkn5zii0b/image/upload/v1781491228/tamdan/avatars/nuw6hvzpngd9qpfaff4n.jpg	phe@gmail.com	$2b$12$Orpc7H4toOlUT6/XaoobKOeeDRGw28xhKQ18f5CN8V0fRRjnN7r5a	teacher	t	+855964141023	\N	\N	\N	\N
11	Cristino	Ronaldo	\N	ronaldo@gmail.com	$2b$12$gMDKHQy/lBuFU.fGgfYT8Oiw/Scs5e5IJMMYTc0RGWNPZ6EyYNupS	admin	t	\N	\N	\N	\N	\N
12	Lim	hong	\N	hong@gmail.com	$2b$12$EosT5bJUrWJus2uKe6cWoOoiUo9Po9pI1ZWQUEpAOl/OUX73YTqUq	student	t	+85598494209	\N	\N	\N	\N
13	Run	Limhong	\N	limhong@gmail.com	$2b$12$djSH3lYGbCP9ct.NDvNBxO9vAIdUlt3zS5jSJpxTa66YCW5s10fvW	student	t	+85598494201	\N	\N	\N	\N
1	limhong	kh	\N	limhong592@gmail.com	$2b$12$klH4C1Trafm8TEvASkqRJOvFj2bJb0CLXpSMeVXgZ5FgMJLBtN3mO	admin	t	\N	\N	\N	\N	\N
6	som	chai	\N	chai@gmail.com	$2b$12$uw/R723VUH/hnB7P2.LBoeHNjlf7KcGkUI0c7HNLIkmdsqKxvOnLu	student	t	+855962165654	974763198	\N	\N	\N
7	Lim	hong	\N	limhai@gmail.com	$2b$12$g9FWLO4FjRKElFpVHCf7geBvoHlI/huDgQDI/utFThDazoXumdTHa	student	t	+85598494201	\N	\N	\N	\N
8	Vat	Nak	\N	nak@gmail.com	$2b$12$p0E9PZHXBqBNozu5cQv3rO0YEvxDp92oOF6wnfxJU0O5CSHqj/Lf.	teacher	t	+85598343344	\N	\N	\N	\N
\.


--
-- TOC entry 5156 (class 0 OID 16417)
-- Dependencies: 224
-- Data for Name: teachers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teachers (id, user_id, subject_id, phone, address, qualification, teacher_code) FROM stdin;
1	2	\N	+85566968050	AnlongKgan,songkat Khhmounh,khan Sensok,Phnom Penh	Master	T-0001
2	8	\N	+85598343344	Smart	degree	T-0002
\.


--
-- TOC entry 5158 (class 0 OID 16428)
-- Dependencies: 226
-- Data for Name: school_classes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.school_classes (id, name, section, teacher_id) FROM stdin;
1	7	A	\N
2	8	A	\N
\.


--
-- TOC entry 5170 (class 0 OID 16512)
-- Dependencies: 238
-- Data for Name: schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schedules (id, class_id, subject_id, teacher_id, day, start_time, end_time) FROM stdin;
1	1	1	1	Monday	07:00:00	09:00:00
\.


--
-- TOC entry 5166 (class 0 OID 16469)
-- Dependencies: 234
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (id, user_id, class_id, gender, guardian_name, guardian_phone, address, student_code) FROM stdin;
1	3	1	Male	Navy	098494201	AnlongKgan,songkat Khhmounh,khan Sensok,Phnom Penh	ST-0001
4	6	1	Male	jk	0993848358	AnlongKgan,songkat Khhmounh,khan Sensok,Phnom Penh	ST-0003
5	7	1	Male	099888888	066968050	Smart\nSmart	ST-0005
7	10	1	Male	rr	098494201	AnlongKgan,songkat Khhmounh,khan Sensok,Phnom Penh	ST-0006
8	12	2	Female	nnnn	dfgrg	\nSmart	ST-0008
9	13	1	Female	df	098494201	AnlongKgan,songkat Khhmounh,khan Sensok,Phnom Penh	ST-0009
\.


--
-- TOC entry 5174 (class 0 OID 16568)
-- Dependencies: 242
-- Data for Name: attendances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendances (id, student_id, class_id, date, status, schedule_id) FROM stdin;
7	1	1	2026-07-04	L	\N
8	1	1	2026-07-05	L	\N
9	1	1	2026-07-06	L	\N
\.


--
-- TOC entry 5168 (class 0 OID 16488)
-- Dependencies: 236
-- Data for Name: class_teachers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class_teachers (id, class_id, teacher_id, subject_id) FROM stdin;
1	1	1	1
3	1	2	2
4	2	1	1
\.


--
-- TOC entry 5162 (class 0 OID 16449)
-- Dependencies: 230
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, title, description, event_date, location) FROM stdin;
2	hhh	hty	2026-07-02	\N
3	fdgffg	fedffdfeffffffffffffffffffffffffffffffffffffffffffffffffffffffffeafeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff	2026-07-02	\N
\.


--
-- TOC entry 5164 (class 0 OID 16460)
-- Dependencies: 232
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.holidays (id, name, date) FROM stdin;
\.


--
-- TOC entry 5172 (class 0 OID 16542)
-- Dependencies: 240
-- Data for Name: homework; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.homework (id, title, description, class_id, subject_id, teacher_id, due_date, file_path, created_at) FROM stdin;
1	Write sesion	Pleas do it	1	1	1	2026-06-05	uploads/homework/IMG_8557.PNG	2026-06-05 09:52:40.5206
2	hh	gr	1	1	1	2026-06-05	uploads/homework/IMG_8557.PNG	2026-06-05 10:18:51.580686
3	tt	tt	1	1	1	2026-06-08	uploads/homework/IMG_8557.PNG	2026-06-08 00:41:15.1739
4	sss	sa	1	1	1	2026-06-13	https://res.cloudinary.com/dkn5zii0b/image/upload/v1781361639/tamdan/homework/mxazcrmacghhwraautue.jpg	2026-06-13 14:40:40.304481
5	sss	sa	1	1	1	2026-06-13	https://res.cloudinary.com/dkn5zii0b/image/upload/v1781361641/tamdan/homework/rtsj6uqujhsedovpwzjj.jpg	2026-06-13 14:40:42.728022
\.


--
-- TOC entry 5178 (class 0 OID 16628)
-- Dependencies: 246
-- Data for Name: homework_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.homework_submissions (id, homework_id, student_id, answer_text, file_path, status, submitted_at, score, teacher_comment, bonus) FROM stdin;
1	1	1	fgfg	uploads/submissions/IMG_6897.JPG	checked	2026-06-05 09:53:31.084603	3	Checked by teacher	0
2	2	1	jj	uploads/submissions/IMG_6897.JPG	submitted	2026-06-05 10:19:43.953263	\N	\N	0
3	3	1	dd	\N	submitted	2026-06-08 00:42:44.760507	\N	\N	0
4	5	1	dfdfrg	https://res.cloudinary.com/dkn5zii0b/image/upload/v1781361709/tamdan/homework/cptmczm1tytjzexm1gnf.jpg	checked	2026-06-13 14:41:50.446203	3	Checked by teacher	3
5	5	4	dfd	\N	checked	2026-06-13 14:44:32.314319	0	Checked by teacher	0
\.


--
-- TOC entry 5160 (class 0 OID 16438)
-- Dependencies: 228
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, title, message, target_role, created_at) FROM stdin;
1	hh	kk	\N	2026-07-01 17:25:56.440701+07
2	New School Event: fdgffg	fedffdfeffffffffffffffffffffffffffffffffffffffffffffffffffffffffeafeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff	\N	2026-07-02 08:52:35.014326+07
\.


--
-- TOC entry 5180 (class 0 OID 16802)
-- Dependencies: 248
-- Data for Name: permission_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permission_requests (id, student_id, class_id, type, start_date, end_date, reason, status, teacher_id, created_at, schedule_id) FROM stdin;
5	1	1	Sick	2026-07-04	2026-07-04	Sick head	approved	1	2026-07-04 14:36:24.243862	\N
6	1	1	Personal	2026-07-05	2026-07-06	c	approved	2	2026-07-05 06:16:40.17412	\N
7	8	2	Sick	2026-07-05	2026-07-05	hh	approved	1	2026-07-05 06:28:12.415692	\N
8	1	1	Family	2026-07-06	2026-07-06	bbb	pending	\N	2026-07-06 16:06:08.151104	1
9	4	1	Family	2026-07-06	2026-07-06	bc	pending	\N	2026-07-06 16:07:01.109276	1
\.


--
-- TOC entry 5176 (class 0 OID 16590)
-- Dependencies: 244
-- Data for Name: scores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scores (id, student_id, class_id, subject_id, teacher_id, semester, month, score, bonus, total_score, max_score, remark) FROM stdin;
3	7	1	1	1	1	1	10	0	10	100	
2	4	1	1	1	1	1	22	0	22	100	
4	5	1	1	1	1	1	23	0	23	100	
5	1	1	2	2	1	1	94	3	97	100	
6	4	1	2	2	1	1	90	0	90	100	
7	5	1	2	2	1	1	88	0	88	100	
8	7	1	2	2	1	1	91	0	91	100	
\.


--
-- TOC entry 5186 (class 0 OID 0)
-- Dependencies: 241
-- Name: attendances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendances_id_seq', 9, true);


--
-- TOC entry 5187 (class 0 OID 0)
-- Dependencies: 235
-- Name: class_teachers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.class_teachers_id_seq', 4, true);


--
-- TOC entry 5188 (class 0 OID 0)
-- Dependencies: 229
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.events_id_seq', 3, true);


--
-- TOC entry 5189 (class 0 OID 0)
-- Dependencies: 231
-- Name: holidays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.holidays_id_seq', 1, false);


--
-- TOC entry 5190 (class 0 OID 0)
-- Dependencies: 239
-- Name: homework_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.homework_id_seq', 5, true);


--
-- TOC entry 5191 (class 0 OID 0)
-- Dependencies: 245
-- Name: homework_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.homework_submissions_id_seq', 5, true);


--
-- TOC entry 5192 (class 0 OID 0)
-- Dependencies: 227
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 2, true);


--
-- TOC entry 5193 (class 0 OID 0)
-- Dependencies: 247
-- Name: permission_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permission_requests_id_seq', 9, true);


--
-- TOC entry 5194 (class 0 OID 0)
-- Dependencies: 237
-- Name: schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schedules_id_seq', 1, true);


--
-- TOC entry 5195 (class 0 OID 0)
-- Dependencies: 225
-- Name: school_classes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.school_classes_id_seq', 2, true);


--
-- TOC entry 5196 (class 0 OID 0)
-- Dependencies: 243
-- Name: scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.scores_id_seq', 8, true);


--
-- TOC entry 5197 (class 0 OID 0)
-- Dependencies: 233
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.students_id_seq', 9, true);


--
-- TOC entry 5198 (class 0 OID 0)
-- Dependencies: 221
-- Name: subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subjects_id_seq', 2, true);


--
-- TOC entry 5199 (class 0 OID 0)
-- Dependencies: 223
-- Name: teachers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teachers_id_seq', 2, true);


--
-- TOC entry 5200 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 13, true);


-- Completed on 2026-07-07 10:36:32

--
-- PostgreSQL database dump complete
--

\unrestrict H6uaO3dK34eH0p1Jt4KdAJ53VaKS1vV9ipRxpQcQvR5EOTaD6eU7gzGAnWsOflV

