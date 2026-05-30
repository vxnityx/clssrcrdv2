from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings

from .models import StudentRecord
from .serializers import StudentRecordSerializer


class StudentRecordListCreateAPIView(generics.ListCreateAPIView):
    queryset = StudentRecord.objects.all()
    serializer_class = StudentRecordSerializer


class StudentRecordRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = StudentRecord.objects.all()
    serializer_class = StudentRecordSerializer
    lookup_field = "student_id"
    lookup_url_kwarg = "student_id"


class StudentRecordLoginAPIView(APIView):
    def post(self, request):
        student_id = (request.data.get("student_id") or "").strip()
        password = (request.data.get("password") or "").strip()
        student_name = (request.data.get("student_name") or "").strip()

        if not student_id:
            return Response(
                {"detail": "student_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not password:
            record = StudentRecord.objects.filter(student_id=student_id).first()
            if not record:
                return Response(
                    {
                        "record_exists": False,
                        "has_password": False,
                        "needs_password": True,
                        "detail": "No account found yet. Enter a password to create one.",
                    },
                    status=status.HTTP_200_OK,
                )

            serializer = StudentRecordSerializer(record)
            return Response(
                {
                    "record_exists": True,
                    "has_password": record.has_password,
                    "needs_password": not record.has_password,
                    "record": serializer.data,
                    "detail": "Password is required to continue." if record.has_password else "Set a password for this student ID.",
                },
                status=status.HTTP_200_OK,
            )

        record, created = StudentRecord.objects.get_or_create(
            student_id=student_id,
            defaults={"student_name": student_name},
        )

        name_changed = bool(student_name and record.student_name != student_name)
        if name_changed:
            record.student_name = student_name

        if not record.has_password:
            record.set_password(password)
            update_fields = ["password_hash"]
            if name_changed:
                update_fields.insert(0, "student_name")
            record.save(update_fields=update_fields)
            serializer = StudentRecordSerializer(record)
            return Response(
                {
                    "created": created,
                    "bootstrapped": True,
                    "has_password": True,
                    "record": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        if not record.check_password(password):
            return Response(
                {"detail": "Invalid student ID or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if name_changed:
            record.save(update_fields=["student_name"])

        serializer = StudentRecordSerializer(record)
        return Response(
            {"created": created, "bootstrapped": False, "has_password": True, "record": serializer.data},
            status=status.HTTP_200_OK,
        )


class AdminPasswordCheckAPIView(APIView):
    def post(self, request):
        password = (request.data.get("password") or "").strip()

        if not password:
            return Response({"detail": "password is required."}, status=status.HTTP_400_BAD_REQUEST)

        if password != getattr(settings, "ADMIN_PASSWORD", "adminopawg123"):
            return Response({"detail": "Invalid admin password."}, status=status.HTTP_403_FORBIDDEN)

        return Response({"authenticated": True}, status=status.HTTP_200_OK)

