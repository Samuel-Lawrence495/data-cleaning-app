from django.urls import path
from .views import ManageDataFrameView

urlpatterns = [
    path('dataframe/', ManageDataFrameView.as_view(), name='manage-dataframe'),
]