# backend/data_cleaning_app/urls.py
from django.urls import path
from .views import FilterRowsView, ManageDataFrameView, HandleMissingRowsView, ReplaceMissingValuesView

urlpatterns = [
    path('dataframe/', ManageDataFrameView.as_view(), name='manage-dataframe'), # For POST, PUT, GET (preview)
    path('dataframe/download/csv/', ManageDataFrameView.as_view(), {'download_format': 'csv'}, name='download-csv'),
    path('dataframe/download/xlsx/', ManageDataFrameView.as_view(), {'download_format': 'xlsx'}, name='download-xlsx'),
    path('dataframe/ops/drop-missing-rows/', HandleMissingRowsView.as_view(), name='op-drop-missing'),
    path('dataframe/ops/filter-rows/', FilterRowsView.as_view(), name='op-filter-rows'),
    path('dataframe/ops/replace-missing-rows/', ReplaceMissingValuesView.as_view(), name='op-replace-missing-rows'),
]