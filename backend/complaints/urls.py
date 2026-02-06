from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_complaint, name='create_complaint'),
    path('list/', views.list_complaints, name='list_complaints'),
    path('<int:complaint_id>/resolve/', views.resolve_complaint, name='resolve_complaint'),
]
