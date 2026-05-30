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

Use the root `Dockerfile` so Railway builds both Node and Python in one service.

Railway deploy behavior:

- Build happens inside the Docker image.
- `python manage.py migrate` runs at container startup.
- `makemigrations` does not run automatically. Keep it local when you change models.

## Docker deploy notes

- The Django admin is available at `/django-admin/`.
- The frontend app is served at `/`, `/students/`, and `/admin/`.
- The frontend export is built during the Docker image build.

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