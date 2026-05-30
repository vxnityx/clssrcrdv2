from django.urls import path

from .views import (
    AdminPasswordCheckAPIView,
    StudentRecordListCreateAPIView,
    StudentRecordLoginAPIView,
    StudentRecordRetrieveUpdateDestroyAPIView,
)

urlpatterns = [
    path("student-records/", StudentRecordListCreateAPIView.as_view(), name="studentrecord-list-create"),
    path("student-records", StudentRecordListCreateAPIView.as_view(), name="studentrecord-list-create-noslash"),
    path("student-records/auth/", StudentRecordLoginAPIView.as_view(), name="studentrecord-auth"),
    path("student-records/auth", StudentRecordLoginAPIView.as_view(), name="studentrecord-auth-noslash"),
    path("admin-auth/", AdminPasswordCheckAPIView.as_view(), name="admin-auth"),
    path("admin-auth", AdminPasswordCheckAPIView.as_view(), name="admin-auth-noslash"),
    path(
        "student-records/<str:student_id>/",
        StudentRecordRetrieveUpdateDestroyAPIView.as_view(),
        name="studentrecord-detail",
    ),
    path(
        "student-records/<str:student_id>",
        StudentRecordRetrieveUpdateDestroyAPIView.as_view(),
        name="studentrecord-detail-noslash",
    ),
]