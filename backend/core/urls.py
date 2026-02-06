from django.urls import path
from . import views

urlpatterns = [
    path('settings/', views.town_settings, name='town_settings'),
]
