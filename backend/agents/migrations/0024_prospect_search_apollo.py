from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('agents', '0023_facebookconfig_page_access_token_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='contact',
            name='apollo_id',
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name='contact',
            name='company',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='contact',
            name='title',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.CreateModel(
            name='ProspectSearchJob',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('filters', models.JSONField(default=dict)),
                ('channels', models.CharField(choices=[('email', 'Email'), ('whatsapp', 'WhatsApp'), ('both', 'Email + WhatsApp')], default='both', max_length=20)),
                ('max_results', models.PositiveIntegerField(default=10)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('running', 'Running'), ('done', 'Done'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('found_count', models.PositiveIntegerField(default=0)),
                ('enriched_count', models.PositiveIntegerField(default=0)),
                ('sent_count', models.PositiveIntegerField(default=0)),
                ('failed_count', models.PositiveIntegerField(default=0)),
                ('error', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
                ('agent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='agents.agent')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='prospect_search_jobs', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='ProspectLead',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('apollo_person_id', models.CharField(db_index=True, max_length=64)),
                ('name', models.CharField(blank=True, max_length=255, null=True)),
                ('title', models.CharField(blank=True, max_length=255, null=True)),
                ('company', models.CharField(blank=True, max_length=255, null=True)),
                ('email', models.EmailField(blank=True, max_length=254, null=True)),
                ('phone', models.CharField(blank=True, max_length=64, null=True)),
                ('raw', models.JSONField(blank=True, default=dict)),
                ('status', models.CharField(choices=[('found', 'Found'), ('enriched', 'Enriched'), ('awaiting_phone', 'Awaiting phone'), ('contacted', 'Contacted'), ('skipped', 'Skipped'), ('failed', 'Failed')], default='found', max_length=20)),
                ('skip_reason', models.CharField(blank=True, max_length=255, null=True)),
                ('enrich_request_id', models.CharField(blank=True, db_index=True, max_length=128, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('contact_email', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='apollo_email_leads', to='agents.contact')),
                ('contact_wa', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='apollo_wa_leads', to='agents.contact')),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='leads', to='agents.prospectsearchjob')),
            ],
            options={
                'unique_together': {('job', 'apollo_person_id')},
            },
        ),
    ]
