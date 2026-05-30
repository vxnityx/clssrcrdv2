from django.contrib.auth.hashers import check_password, make_password
from django.db import models


class StudentRecord(models.Model):
	student_id = models.CharField(max_length=50, unique=True)
	student_name = models.CharField(max_length=200, blank=True)
	password_hash = models.CharField(max_length=128, blank=True, default="")
	record_data = models.JSONField(blank=True, default=dict)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["student_id"]

	def __str__(self) -> str:
		return self.student_id

	@property
	def has_password(self) -> bool:
		return bool(self.password_hash)

	def set_password(self, raw_password: str) -> None:
		self.password_hash = make_password(raw_password) if raw_password else ""

	def check_password(self, raw_password: str) -> bool:
		if not self.password_hash:
			return False

		return check_password(raw_password, self.password_hash)
