from rest_framework import serializers

from .models import StudentRecord


class StudentRecordSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        trim_whitespace=False,
    )
    has_password = serializers.SerializerMethodField()

    class Meta:
        model = StudentRecord
        fields = [
            "id",
            "student_id",
            "student_name",
            "password",
            "has_password",
            "record_data",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "has_password", "created_at", "updated_at"]

    def get_has_password(self, instance):
        return instance.has_password

    def create(self, validated_data):
        password = validated_data.pop("password", "")
        record = super().create(validated_data)
        if password:
            record.set_password(password)
            record.save(update_fields=["password_hash"])
        return record

    def update(self, instance, validated_data):
        password = validated_data.pop("password", serializers.empty)
        instance = super().update(instance, validated_data)
        if password is not serializers.empty:
            instance.set_password(password)
            instance.save(update_fields=["password_hash"])
        return instance