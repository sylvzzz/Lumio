from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('calendarevents', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='calendarevent',
            name='embedding',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
