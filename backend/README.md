# Backend + Frontend In One Service

This project serves the exported Next.js frontend from Django so you can run one service locally and on Railway.

## Local run

1. Build the frontend export:
   - `cd frontend`
   - `npm run build`
2. Run Django:
   - `cd backend`
   - `python manage.py migrate`
   - `python manage.py runserver`

## Railway setup

Use one Railway service with these commands:

- Build command:
   - `cd frontend && npm ci && npm run build && cd ../backend && python -m pip install -r requirements.txt && python manage.py collectstatic --noinput`
- Start command:
   - `cd backend && python manage.py migrate && gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT`

Railway does not run `makemigrations` or `migrate` automatically. `makemigrations` should stay local for code changes, and `migrate` needs to run in your deploy command or startup command like above.

## Environment variables

Set these in Railway or locally as needed:

- `DATABASE_URL` for the database connection
- `DEBUG` to control debug mode
- `ALLOWED_HOSTS` as a comma-separated list
- `ADMIN_PASSWORD` for the frontend admin gate

## Notes

- The Django admin is available at `/django-admin/`.
- The frontend app is served at `/`, `/students/`, and `/admin/`.
- The frontend export must exist in `frontend/out` before Django can serve it.