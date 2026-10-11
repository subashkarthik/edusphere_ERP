"""Base schema for EduSphere LMS

Revision ID: 0001_base_schema
Revises: 
Create Date: 2026-10-11 17:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from database import Base
import models  # Ensure all model tables are registered in Base.metadata

revision: str = '0001_base_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BASE_TABLE_NAMES = [
    'organizations',
    'departments',
    'users',
    'courses',
    'enrollments',
    'timetable_entries',
    'course_materials',
    'attendance_sessions',
    'attendance_logs',
    'exam_schedules',
    'exam_results',
    'quizzes',
    'quiz_questions',
    'quiz_attempts',
    'modules',
    'lessons',
    'assignments',
    'submissions',
    'discussions',
    'lesson_progress',
    'certificates',
    'certificate_settings',
    'notifications',
    'audit_logs',
    'learning_metrics',
    'recommendations',
    'user_notifications',
    'study_tasks',
    'fee_structures',
    'fee_payments',
    'ledger_entries',
    'placement_drives',
    'placement_applications',
    'placement_stats',
    'announcements',
    'leave_requests',
    'library_books',
    'book_issues',
    'synced_subjects',
    'synced_faculties',
    'synced_rooms',
    'synced_time_slots',
    'synced_timetables',
    'synced_semesters',
    'synced_attendances'
]


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # Create any missing base tables
    tables_to_create = [
        Base.metadata.tables[name]
        for name in BASE_TABLE_NAMES
        if name in Base.metadata.tables and name not in existing_tables
    ]

    if tables_to_create:
        Base.metadata.create_all(bind, tables=tables_to_create)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # Drop in reverse dependency order
    for name in reversed(BASE_TABLE_NAMES):
        if name in existing_tables:
            try:
                op.drop_table(name)
            except Exception as e:
                print(f"[Downgrade Notice] drop_table({name}): {e}")
