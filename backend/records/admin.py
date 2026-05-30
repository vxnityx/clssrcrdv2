from django.contrib import admin

from .models import StudentRecord


@admin.register(StudentRecord)
class StudentRecordAdmin(admin.ModelAdmin):
	list_display = ("student_id", "student_name", "has_password", "updated_at")
	search_fields = ("student_id", "student_name")
	readonly_fields = ("created_at", "updated_at", "password_hash")
	ordering = ("student_id",)
