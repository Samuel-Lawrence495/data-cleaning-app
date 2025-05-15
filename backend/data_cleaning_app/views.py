from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
import pandas as pd
import io
from .serializers import FileUploadSerializer 

# ----------------------
# File upload
# ----------------------

class XLSXUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser) 

    def post(self, request, *args, **kwargs):
        # ---  input validation ---
        file_serializer = FileUploadSerializer(data=request.data)
        if file_serializer.is_valid():
            uploaded_file = file_serializer.validated_data['file']
        else:
            return Response(file_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if 'file' not in request.FILES:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = request.FILES['file']
        filename = uploaded_file.name.lower()

        # Handle invalid file types
        if not (filename.endswith('.xlsx') or filename.endswith('.csv')):
            return Response({"error": "Invalid file type. Please upload a .xlsx or .csv file."}, status=status.HTTP_400_BAD_REQUEST)
        
        xlsx = False
        csv = False
        if uploaded_file.name.endswith('.xlsx'):
            xlsx = True
        elif uploaded_file.name.endswith('.csv'):
            csv = True
        else:
            return Response({"Error": "Not a valid file extension"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Read the file in-memory 
            ### May need to change handling for larger files
            if xlsx == True:
                df = pd.read_excel(uploaded_file, engine='openpyxl')
            if csv == True:
                df = pd.read_csv(uploaded_file)

            # Prepare data for JSON response (e.g., first 10 rows)
            num_preview_rows = 100
            headers = df.columns.tolist()
            # Convert NaN/NaT to None (or string "N/A") for JSON serialization
            rows_data = df.head(num_preview_rows).fillna('').astype(str).values.tolist()


            response_data = {
                "filename": uploaded_file.name,
                "headers": headers,
                "rows": rows_data,
                "message": "File processed successfully."
            }
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Error processing file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)