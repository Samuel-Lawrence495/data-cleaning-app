from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
import pandas as pd
import io
from .serializers import FileUploadSerializer 
        
# -------------------------------
# File modifications
# -------------------------------

class ManageDataFrameView(APIView):
    parser_classes = (MultiPartParser, FormParser) # For initial upload

    def _get_df_from_session(self, request):
        """Helper to retrieve and deserialize DataFrame from session."""
        serialized_df = request.session.get('current_dataframe_json')
        if serialized_df:
            return pd.read_json(serialized_df, orient='split')
        return None

    def _save_df_to_session(self, request, df):
        """Helper to serialize and save DataFrame to session."""
        if df is not None:
            request.session['current_dataframe_json'] = df.to_json(orient='split')
            request.session['current_filename'] = request.session.get('current_filename', 'edited_file.xlsx') # Keep filename
        else:
            if 'current_dataframe_json' in request.session:
                del request.session['current_dataframe_json']
            if 'current_filename' in request.session:
                del request.session['current_filename']


    def _prepare_preview_response(self, df, filename, message="Preview updated."):
        """Helper to create the JSON response for the frontend."""
        if df is None:
            return {
                "filename": filename or "N/A",
                "headers": [],
                "rows": [],
                "total_rows_in_file": 0,
                "preview_rows_shown": 0,
                "message": "No data to display."
            }

        num_preview_rows = 100
        headers = df.columns.tolist()
        df_preview = df.head(num_preview_rows)
        rows_data = df_preview.fillna('').astype(str).values.tolist()

        return {
            "filename": filename,
            "headers": headers,
            "rows": rows_data,
            "total_rows_in_file": len(df),
            "preview_rows_shown": len(rows_data),
            "message": message
        }

    # Handles initial file upload
    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = request.FILES['file']
        filename_lower = uploaded_file.name.lower()

        if not (filename_lower.endswith('.xlsx') or filename_lower.endswith('.csv')):
            return Response({"error": "Invalid file type. Please upload .xlsx or .csv."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if filename_lower.endswith('.xlsx'):
                df = pd.read_excel(uploaded_file, engine='openpyxl')
            else: # .csv
                df = pd.read_csv(uploaded_file)

            # Store original filename and DataFrame in session
            request.session['current_filename'] = uploaded_file.name
            self._save_df_to_session(request, df)

            response_data = self._prepare_preview_response(df, uploaded_file.name, "File processed successfully.")
            return Response(response_data, status=status.HTTP_200_OK)

        except pd.errors.EmptyDataError:
            self._save_df_to_session(request, None) # Clear any previous df
            return Response({"error": "The uploaded file is empty."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            self._save_df_to_session(request, None) # Clear any previous df
            print(f"Error processing upload: {e}") # Log actual error
            return Response({"error": f"Error processing file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Handles dropping a column
    def put(self, request, *args, **kwargs): # Using PUT for modification
        column_to_drop = request.data.get('column_name')
        if not column_to_drop:
            return Response({"error": "No column_name provided to drop."}, status=status.HTTP_400_BAD_REQUEST)

        df = self._get_df_from_session(request)
        filename = request.session.get('current_filename', 'edited_file.xlsx')

        if df is None:
            return Response({"error": "No active DataFrame in session. Please upload a file first."}, status=status.HTTP_400_BAD_REQUEST)

        if column_to_drop not in df.columns:
            # Optionally, just return current state if column not found, or an error
            # For now, let's return current state with a message
            response_data = self._prepare_preview_response(df, filename, f"Column '{column_to_drop}' not found.")
            return Response(response_data, status=status.HTTP_200_OK) # Or 404 if preferred

        try:
            df.drop(columns=[column_to_drop], inplace=True)
            self._save_df_to_session(request, df) # Save modified DataFrame

            response_data = self._prepare_preview_response(df, filename, f"Column '{column_to_drop}' dropped.")
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error dropping column: {e}") # Log actual error
            return Response({"error": f"Error dropping column: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Optional: Get current DataFrame state (e.g., if user refreshes edit page)
    def get(self, request, *args, **kwargs):
        df = self._get_df_from_session(request)
        filename = request.session.get('current_filename')
        if df is None or filename is None:
             return Response({"message": "No active data. Please upload a file."}, status=status.HTTP_200_OK) # Or 404

        response_data = self._prepare_preview_response(df, filename, "Current data preview.")
        return Response(response_data, status=status.HTTP_200_OK)