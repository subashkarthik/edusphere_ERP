"""Add profiles, policies, missing columns, indexes, and unique constraints

Revision ID: 0002_core_entities
Revises: 0001_base_schema
Create Date: 2026-10-11 17:05:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0002_core_entities'
down_revision: Union[str, None] = '0001_base_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # 1. Create student_profiles if not present
    if 'student_profiles' not in existing_tables:
        op.create_table(
            'student_profiles',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('org_id', sa.String(length=36), sa.ForeignKey('organizations.id', name='fk_student_profiles_org_id'), nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE', name='fk_student_profiles_user_id'), nullable=False),
            sa.Column('register_no', sa.String(length=50), nullable=True),
            sa.Column('department', sa.String(length=100), nullable=True),
            sa.Column('year_semester', sa.String(length=50), nullable=True),
            sa.Column('section', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.UniqueConstraint('user_id', name='uq_student_profiles_user_id'),
            sa.UniqueConstraint('org_id', 'register_no', name='uq_student_profiles_org_regno'),
        )
        op.create_index('ix_student_profiles_org_id', 'student_profiles', ['org_id'])
        op.create_index('ix_student_profiles_register_no', 'student_profiles', ['register_no'])

    # 2. Create faculty_profiles if not present
    if 'faculty_profiles' not in existing_tables:
        op.create_table(
            'faculty_profiles',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('org_id', sa.String(length=36), sa.ForeignKey('organizations.id', name='fk_faculty_profiles_org_id'), nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE', name='fk_faculty_profiles_user_id'), nullable=False),
            sa.Column('employee_id', sa.String(length=50), nullable=True),
            sa.Column('department', sa.String(length=100), nullable=True),
            sa.Column('designation', sa.String(length=100), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.UniqueConstraint('user_id', name='uq_faculty_profiles_user_id'),
            sa.UniqueConstraint('org_id', 'employee_id', name='uq_faculty_profiles_org_empid'),
        )
        op.create_index('ix_faculty_profiles_org_id', 'faculty_profiles', ['org_id'])
        op.create_index('ix_faculty_profiles_employee_id', 'faculty_profiles', ['employee_id'])

    # 3. Create certificate_policies if not present
    if 'certificate_policies' not in existing_tables:
        op.create_table(
            'certificate_policies',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('org_id', sa.String(length=36), sa.ForeignKey('organizations.id', name='fk_certificate_policies_org_id'), nullable=False),
            sa.Column('course_id', sa.String(length=36), sa.ForeignKey('courses.id', name='fk_certificate_policies_course_id'), nullable=False),
            sa.Column('min_attendance_pct', sa.Float(), nullable=False, server_default='75.0'),
            sa.Column('min_assessment_pct', sa.Float(), nullable=False, server_default='50.0'),
            sa.Column('min_progress_pct', sa.Float(), nullable=False, server_default='100.0'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.UniqueConstraint('course_id', name='uq_certificate_policies_course_id'),
        )
        op.create_index('ix_certificate_policies_org_id', 'certificate_policies', ['org_id'])
        op.create_index('ix_certificate_policies_course_id', 'certificate_policies', ['course_id'])

    # Helper function to get existing column names for a table
    def get_column_names(table_name: str):
        return {col['name'] for col in inspector.get_columns(table_name)}

    # 4. Alter users table
    if 'users' in existing_tables:
        user_cols = get_column_names('users')
        with op.batch_alter_table('users') as batch_op:
            if 'login_id' not in user_cols:
                batch_op.add_column(sa.Column('login_id', sa.String(length=100), nullable=True))
                batch_op.create_unique_constraint('uq_users_login_id', ['login_id'])
                batch_op.create_index('ix_users_login_id', ['login_id'])
            if 'must_change_password' not in user_cols:
                batch_op.add_column(sa.Column('must_change_password', sa.Boolean(), server_default='0', nullable=False))
            if 'created_by' not in user_cols:
                batch_op.add_column(sa.Column('created_by', sa.String(length=36), sa.ForeignKey('users.id', name='fk_users_created_by'), nullable=True))
            if 'last_login_at' not in user_cols:
                batch_op.add_column(sa.Column('last_login_at', sa.DateTime(), nullable=True))

    # 5. Alter courses table
    if 'courses' in existing_tables:
        course_cols = get_column_names('courses')
        with op.batch_alter_table('courses') as batch_op:
            if 'title' not in course_cols:
                batch_op.add_column(sa.Column('title', sa.String(length=255), nullable=True))
            try:
                batch_op.create_unique_constraint('uq_courses_org_code', ['org_id', 'code'])
            except Exception:
                pass

    # 6. Alter enrollments table
    if 'enrollments' in existing_tables:
        enroll_cols = get_column_names('enrollments')
        with op.batch_alter_table('enrollments') as batch_op:
            if 'enrolled_by' not in enroll_cols:
                batch_op.add_column(sa.Column('enrolled_by', sa.String(length=36), sa.ForeignKey('users.id', name='fk_enrollments_enrolled_by'), nullable=True))
            try:
                batch_op.create_unique_constraint('uq_enrollments_student_course', ['student_id', 'course_id'])
            except Exception:
                pass

    # 7. Alter attendance_sessions table
    if 'attendance_sessions' in existing_tables:
        session_cols = get_column_names('attendance_sessions')
        with op.batch_alter_table('attendance_sessions') as batch_op:
            if 'period' not in session_cols:
                batch_op.add_column(sa.Column('period', sa.String(length=50), nullable=True))
            if 'topic' not in session_cols:
                batch_op.add_column(sa.Column('topic', sa.String(length=255), nullable=True))
            if 'created_by' not in session_cols:
                batch_op.add_column(sa.Column('created_by', sa.String(length=36), sa.ForeignKey('users.id', name='fk_attendance_sessions_created_by'), nullable=True))

    # 8. Alter attendance_logs table
    if 'attendance_logs' in existing_tables:
        log_cols = get_column_names('attendance_logs')
        with op.batch_alter_table('attendance_logs') as batch_op:
            if 'marked_by' not in log_cols:
                batch_op.add_column(sa.Column('marked_by', sa.String(length=36), sa.ForeignKey('users.id', name='fk_attendance_logs_marked_by'), nullable=True))
            try:
                batch_op.create_unique_constraint('uq_attendance_session_student', ['session_id', 'student_id'])
            except Exception:
                pass

    # 9. Alter certificates table
    if 'certificates' in existing_tables:
        cert_cols = get_column_names('certificates')
        with op.batch_alter_table('certificates') as batch_op:
            if 'revoked_at' not in cert_cols:
                batch_op.add_column(sa.Column('revoked_at', sa.DateTime(), nullable=True))
            try:
                batch_op.create_unique_constraint('uq_certificates_code', ['certificate_code'])
            except Exception:
                pass

    # 10. Alter lesson_progress table
    if 'lesson_progress' in existing_tables:
        with op.batch_alter_table('lesson_progress') as batch_op:
            try:
                batch_op.create_unique_constraint('uq_lesson_progress_user_lesson', ['user_id', 'lesson_id'])
            except Exception:
                pass

    # 11. Alter submissions table
    if 'submissions' in existing_tables:
        with op.batch_alter_table('submissions') as batch_op:
            try:
                batch_op.create_unique_constraint('uq_submissions_assignment_student', ['assignment_id', 'student_id'])
            except Exception:
                pass

    # 12. Alter audit_logs table
    if 'audit_logs' in existing_tables:
        audit_cols = get_column_names('audit_logs')
        with op.batch_alter_table('audit_logs') as batch_op:
            if 'actor_id' not in audit_cols:
                batch_op.add_column(sa.Column('actor_id', sa.String(length=36), sa.ForeignKey('users.id', name='fk_audit_logs_actor_id'), nullable=True))
                batch_op.create_index('ix_audit_logs_actor_id', ['actor_id'])
            if 'entity' not in audit_cols:
                batch_op.add_column(sa.Column('entity', sa.String(length=50), nullable=True))
                batch_op.create_index('ix_audit_logs_entity', ['entity'])
            if 'entity_id' not in audit_cols:
                batch_op.add_column(sa.Column('entity_id', sa.String(length=36), nullable=True))
                batch_op.create_index('ix_audit_logs_entity_id', ['entity_id'])
            if 'before_state' not in audit_cols:
                batch_op.add_column(sa.Column('before_state', sa.JSON(), nullable=True))
            if 'after_state' not in audit_cols:
                batch_op.add_column(sa.Column('after_state', sa.JSON(), nullable=True))
            if 'ip' not in audit_cols:
                batch_op.add_column(sa.Column('ip', sa.String(length=45), nullable=True))
            if 'created_at' not in audit_cols:
                batch_op.add_column(sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True))
                batch_op.create_index('ix_audit_logs_created_at', ['created_at'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # Drop tables added in 0002
    if 'certificate_policies' in existing_tables:
        op.drop_table('certificate_policies')
    if 'faculty_profiles' in existing_tables:
        op.drop_table('faculty_profiles')
    if 'student_profiles' in existing_tables:
        op.drop_table('student_profiles')

    if 'audit_logs' in existing_tables:
        audit_cols = {col['name'] for col in inspector.get_columns('audit_logs')}
        audit_idxs = {idx['name'] for idx in inspector.get_indexes('audit_logs')}
        with op.batch_alter_table('audit_logs') as batch_op:
            for idx in ['ix_audit_logs_created_at', 'ix_audit_logs_actor_id', 'ix_audit_logs_entity', 'ix_audit_logs_entity_id']:
                if idx in audit_idxs:
                    batch_op.drop_index(idx)
            for col in ['created_at', 'ip', 'after_state', 'before_state', 'entity_id', 'entity', 'actor_id']:
                if col in audit_cols:
                    try:
                        batch_op.drop_column(col)
                    except Exception:
                        pass

    if 'certificates' in existing_tables:
        cert_cols = {col['name'] for col in inspector.get_columns('certificates')}
        if 'revoked_at' in cert_cols:
            with op.batch_alter_table('certificates') as batch_op:
                try:
                    batch_op.drop_column('revoked_at')
                except Exception:
                    pass

    if 'attendance_logs' in existing_tables:
        log_cols = {col['name'] for col in inspector.get_columns('attendance_logs')}
        if 'marked_by' in log_cols:
            with op.batch_alter_table('attendance_logs') as batch_op:
                try:
                    batch_op.drop_column('marked_by')
                except Exception:
                    pass

    if 'attendance_sessions' in existing_tables:
        session_cols = {col['name'] for col in inspector.get_columns('attendance_sessions')}
        with op.batch_alter_table('attendance_sessions') as batch_op:
            for col in ['created_by', 'topic', 'period']:
                if col in session_cols:
                    try:
                        batch_op.drop_column(col)
                    except Exception:
                        pass

    if 'enrollments' in existing_tables:
        enroll_cols = {col['name'] for col in inspector.get_columns('enrollments')}
        if 'enrolled_by' in enroll_cols:
            with op.batch_alter_table('enrollments') as batch_op:
                try:
                    batch_op.drop_column('enrolled_by')
                except Exception:
                    pass

    if 'courses' in existing_tables:
        course_cols = {col['name'] for col in inspector.get_columns('courses')}
        if 'title' in course_cols:
            with op.batch_alter_table('courses') as batch_op:
                try:
                    batch_op.drop_column('title')
                except Exception:
                    pass

    if 'users' in existing_tables:
        user_cols = {col['name'] for col in inspector.get_columns('users')}
        user_idxs = {idx['name'] for idx in inspector.get_indexes('users')}
        with op.batch_alter_table('users') as batch_op:
            if 'ix_users_login_id' in user_idxs:
                batch_op.drop_index('ix_users_login_id')
            for col in ['last_login_at', 'created_by', 'must_change_password', 'login_id']:
                if col in user_cols:
                    try:
                        batch_op.drop_column(col)
                    except Exception:
                        pass
