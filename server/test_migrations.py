import os
import subprocess
import sys

def run():
    test_db = os.path.abspath('test_empty_migration.db')
    if os.path.exists(test_db):
        os.remove(test_db)

    db_url = f'sqlite:///{test_db.replace(os.sep, "/")}'
    env = dict(os.environ, DATABASE_URL=db_url)

    print('--- Step 1: alembic upgrade head on EMPTY database ---')
    res1 = subprocess.run(['alembic', 'upgrade', 'head'], capture_output=True, text=True, env=env)
    print(res1.stdout)
    if res1.returncode != 0:
        print('STDERR:\n', res1.stderr)
        return False

    print('--- Step 2: alembic downgrade base ---')
    res2 = subprocess.run(['alembic', 'downgrade', 'base'], capture_output=True, text=True, env=env)
    print(res2.stdout)
    if res2.returncode != 0:
        print('STDERR:\n', res2.stderr)
        return False

    print('--- Step 3: alembic upgrade head re-run ---')
    res3 = subprocess.run(['alembic', 'upgrade', 'head'], capture_output=True, text=True, env=env)
    print(res3.stdout)
    if res3.returncode != 0:
        print('STDERR:\n', res3.stderr)
        return False

    if os.path.exists(test_db):
        os.remove(test_db)
    print('=== ALL ALEMBIC TESTS PASSED SUCCESSFULLY! ===')
    return True

if __name__ == '__main__':
    ok = run()
    sys.exit(0 if ok else 1)
