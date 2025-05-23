from django.shortcuts import render 
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import pandas as pd

class ManageDataFrameView(APIView):
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def _get_df_from_session(self, request):
        """Helper to retrieve and deserialize DataFrame from session."""
        print(f"DJANGO _get_df_from_session: Attempting to get. Session ID: {request.session.session_key}")
        print(f"DJANGO _get_df_from_session: Session keys on get: {list(request.session.keys())}")
        serialized_df = request.session.get('current_dataframe_json')
        if serialized_df:
            try:
                df = pd.read_json(serialized_df, orient='split')
                print("DJANGO _get_df_from_session: DataFrame successfully deserialized from session.")
                return df
            except Exception as e:
                print(f"DJANGO _get_df_from_session: ERROR deserializing DataFrame from session: {e}")
                if 'current_dataframe_json' in request.session:
                    del request.session['current_dataframe_json']
                    request.session.save()
                return None
        else:
            print("DJANGO _get_df_from_session: 'current_dataframe_json' not found in session.")
        return None

    def _save_df_to_session(self, request, df, filename=None):
        """Helper to serialize and save DataFrame and filename to session."""
        print(f"DJANGO _save_df_to_session: Attempting to save. Session ID before save: {request.session.session_key}")
        if df is not None:
            try:
                serialized_df = df.to_json(orient='split')
                print(f"DJANGO _save_df_to_session: Serialized DF (first 100 chars): {serialized_df[:100]}")
                request.session['current_dataframe_json'] = serialized_df
                if filename:
                    request.session['current_filename'] = filename
                # Ensure current_filename is set if not provided but df exists
                elif 'current_filename' not in request.session:
                     request.session['current_filename'] = 'edited_file.xlsx'

                request.session.save() # Explicitly save the session
                print(f"DJANGO _save_df_to_session: Saved 'current_dataframe_json' and 'current_filename'. Session ID after save: {request.session.session_key}")
                print(f"DJANGO _save_df_to_session: Session keys after save: {list(request.session.keys())}")
            except Exception as e:
                print(f"DJANGO _save_df_to_session: ERROR serializing or saving to session: {e}")
        else:
            # Clear session data if df is None
            if 'current_dataframe_json' in request.session:
                del request.session['current_dataframe_json']
            if 'current_filename' in request.session:
                del request.session['current_filename']
            request.session.save() # Explicitly save the session when clearing
            print(f"DJANGO _save_df_to_session: Cleared session data. Session ID after clear: {request.session.session_key}")


    def _prepare_preview_response(self, df, filename, message="Preview updated."):
        """Helper to create the JSON response for the frontend."""
        if df is None or filename is None: 
            return {
                "filename": filename or "N/A",
                "headers": [],
                "rows": [],
                "total_rows_in_file": 0,
                "preview_rows_shown": 0,
                "message": "No data to display or filename missing."
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
        print(f"DJANGO POST: Received request. Session ID on entry: {request.session.session_key}")
        if 'file' not in request.FILES:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = request.FILES['file']
        filename_lower = uploaded_file.name.lower()

        if not (filename_lower.endswith('.xlsx') or filename_lower.endswith('.csv')):
            return Response({"error": "Invalid file type. Please upload .xlsx or .csv."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            print(f"DJANGO POST: Reading file: {uploaded_file.name}")
            if filename_lower.endswith('.xlsx'):
                df = pd.read_excel(uploaded_file, engine='openpyxl')
            else: # .csv
                df = pd.read_csv(uploaded_file)
            print(f"DJANGO POST: File read into DataFrame. Shape: {df.shape}")

            # Save DataFrame and original filename to session
            self._save_df_to_session(request, df, uploaded_file.name)

            response_data = self._prepare_preview_response(df, uploaded_file.name, "File processed successfully.")
            print("DJANGO POST: Prepared response, returning to client.")
            return Response(response_data, status=status.HTTP_200_OK)

        except pd.errors.EmptyDataError:
            print("DJANGO POST: Error - EmptyDataError")
            self._save_df_to_session(request, None) # Clear any previous session df
            return Response({"error": "The uploaded file is empty."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"DJANGO POST: Error processing upload: {e}")
            import traceback
            traceback.print_exc() # Print full traceback for debugging
            self._save_df_to_session(request, None) # Clear any previous session df
            return Response({"error": f"Error processing file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Handles dropping a column
    def put(self, request, *args, **kwargs):
        print(f"DJANGO PUT: Received request. Session ID on entry: {request.session.session_key}")
        print(f"DJANGO PUT: Request data: {request.data}")
        column_to_drop = request.data.get('column_name')

        if not column_to_drop:
            print("DJANGO PUT: Error - No column_name provided.")
            return Response({"error": "No column_name provided to drop."}, status=status.HTTP_400_BAD_REQUEST)

        df = self._get_df_from_session(request)
        # Retrieve filename from session; it should have been set by POST
        filename = request.session.get('current_filename')

        if df is None: # _get_df_from_session already prints details
            return Response({"error": "No active DataFrame in session. Please upload a file first."}, status=status.HTTP_400_BAD_REQUEST)
        if filename is None: # Should not happen if POST worked
             print("DJANGO PUT: Error - 'current_filename' not found in session, though DataFrame exists.")
             return Response({"error": "Session inconsistency: Filename missing. Please re-upload."}, status=status.HTTP_400_BAD_REQUEST)


        print(f"DJANGO PUT: DataFrame columns before drop: {df.columns.tolist()}")
        if column_to_drop not in df.columns:
            print(f"DJANGO PUT: Column '{column_to_drop}' not found in DataFrame.")
            response_data = self._prepare_preview_response(df, filename, f"Column '{column_to_drop}' not found in the current data.")
            # Still save the (unchanged) df to session to refresh its expiry, perhaps
            self._save_df_to_session(request, df, filename)
            return Response(response_data, status=status.HTTP_200_OK) # Client might see this as success if it updates UI

        try:
            df.drop(columns=[column_to_drop], inplace=True)
            print(f"DJANGO PUT: DataFrame columns after drop: {df.columns.tolist()}")
            self._save_df_to_session(request, df, filename) # Save modified DataFrame

            response_data = self._prepare_preview_response(df, filename, f"Column '{column_to_drop}' dropped successfully.")
            print("DJANGO PUT: Prepared response, returning to client.")
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"DJANGO PUT: Error during df.drop or save: {e}")
            import traceback
            traceback.print_exc()
            return Response({"error": f"Error dropping column: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request, *args, **kwargs):
        print(f"DJANGO GET: Received request. Session ID on entry: {request.session.session_key}")
        df = self._get_df_from_session(request)
        filename = request.session.get('current_filename')

        # If df is None OR filename is None, we consider the session state incomplete for preview
        if df is None or filename is None:
             print("DJANGO GET: No complete active data in session for GET request.")
             # Send a response that frontend can interpret as "no data"
             return Response(self._prepare_preview_response(None, None, "No active data session found. Please upload a file."), status=status.HTTP_200_OK)

        response_data = self._prepare_preview_response(df, filename, "Current data preview retrieved.")
        print("DJANGO GET: Prepared response, returning to client.")
        return Response(response_data, status=status.HTTP_200_OK)