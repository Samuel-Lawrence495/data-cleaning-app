from django.urls import path
from .views import XLSXUploadView

urlpatterns = [
    path('upload-xlsx/', XLSXUploadView.as_view(), name='upload-xlsx'),
]