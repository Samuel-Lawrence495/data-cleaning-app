from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import pandas as pd
import io
import traceback 
from sklearn.preprocessing import LabelEncoder

# --------------
# Helpers
# --------------

class Helpers:
    def _get_df_from_session(self, request):
        """Helper to retrieve and deserialize DataFrame from session."""
        serialized_df = request.session.get('current_dataframe_json')
        if serialized_df:
            try:
                df = pd.read_json(serialized_df, orient='split')
                return df
            except Exception as e:
                print(f"MIXIN _get_df_from_session: ERROR deserializing DataFrame: {e}")
                if 'current_dataframe_json' in request.session:
                    del request.session['current_dataframe_json']
                    request.session.save()
                return None
        return None

    def _save_df_to_session(self, request, df, filename=None):
        """Helper to serialize and save DataFrame and filename to session."""
        if df is not None:
            try:
                serialized_df = df.to_json(orient='split')
                request.session['current_dataframe_json'] = serialized_df
                if filename: # Only update filename if explicitly provided
                    request.session['current_filename'] = filename
                elif 'current_filename' not in request.session and filename is None: # Fallback if never set
                     request.session['current_filename'] = 'edited_file.xlsx'

                request.session.save()
                # print(f"MIXIN _save_df_to_session: Saved data. Session keys: {list(request.session.keys())}")
            except Exception as e:
                print(f"MIXIN _save_df_to_session: ERROR serializing or saving: {e}")
        else: # Clear session data if df is None
            if 'current_dataframe_json' in request.session:
                del request.session['current_dataframe_json']
            if 'current_filename' in request.session: # Optionally clear filename too or leave it
                del request.session['current_filename']
            request.session.save()
            # print(f"MIXIN _save_df_to_session: Cleared session data.")

    def _get_current_filename_from_session(self, request):
        return request.session.get('current_filename')

    def _prepare_preview_response(self, df, filename, message="Preview updated."):
        """Helper to create the JSON response for the frontend."""
        if df is None or filename is None:
            return {
                "filename": filename or "N/A", "headers": [], "rows": [],
                "total_rows_in_file": 0, "preview_rows_shown": 0,
                "message": "No data to display or filename missing."
            }
        num_preview_rows = 100
        headers = df.columns.tolist()
        df_preview = df.head(num_preview_rows)
        rows_data = df_preview.fillna('').astype(str).values.tolist()
        return {
            "filename": filename, "headers": headers, "rows": rows_data,
            "total_rows_in_file": len(df), "preview_rows_shown": len(rows_data),
            "message": message
        }
    
# -----------------------------------------
# DataFrame state management
# -----------------------------------------

# Manage DataFrame & drop columns
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
                # print(f"DJANGO _save_df_to_session: Serialized DF (first 100 chars): {serialized_df[:100]}")
                request.session['current_dataframe_json'] = serialized_df
                if filename:
                    request.session['current_filename'] = filename
                elif 'current_filename' not in request.session:
                     request.session['current_filename'] = 'edited_file.xlsx'

                request.session.save()
                print(f"DJANGO _save_df_to_session: Saved 'current_dataframe_json' and 'current_filename'. Session ID after save: {request.session.session_key}")
                print(f"DJANGO _save_df_to_session: Session keys after save: {list(request.session.keys())}")
            except Exception as e:
                print(f"DJANGO _save_df_to_session: ERROR serializing or saving to session: {e}")
        else:
            if 'current_dataframe_json' in request.session:
                del request.session['current_dataframe_json']
            if 'current_filename' in request.session:
                del request.session['current_filename']
            request.session.save()
            print(f"DJANGO _save_df_to_session: Cleared session data. Session ID after clear: {request.session.session_key}")

    def _prepare_preview_response(self, df, filename, message="Preview updated."):
        if df is None or filename is None:
            return {
                "filename": filename or "N/A", "headers": [], "rows": [],
                "total_rows_in_file": 0, "preview_rows_shown": 0,
                "message": "No data to display or filename missing."
            }
        num_preview_rows = 100
        headers = df.columns.tolist()
        df_preview = df.head(num_preview_rows)
        rows_data = df_preview.fillna('').astype(str).values.tolist()
        return {
            "filename": filename, "headers": headers, "rows": rows_data,
            "total_rows_in_file": len(df), "preview_rows_shown": len(rows_data),
            "message": message
        }

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

            self._save_df_to_session(request, df, uploaded_file.name) # Pass filename

            response_data = self._prepare_preview_response(df, uploaded_file.name, "File processed successfully.")
            print("DJANGO POST: Prepared response, returning to client.")
            return Response(response_data, status=status.HTTP_200_OK)

        except pd.errors.EmptyDataError:
            print("DJANGO POST: Error - EmptyDataError")
            self._save_df_to_session(request, None)
            return Response({"error": "The uploaded file is empty."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"DJANGO POST: Error processing upload: {e}")
            traceback.print_exc()
            self._save_df_to_session(request, None)
            return Response({"error": f"Error processing file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, *args, **kwargs):
        print(f"DJANGO PUT: Received request. Session ID on entry: {request.session.session_key}")
        print(f"DJANGO PUT: Request data: {request.data}")
        column_to_drop = request.data.get('column_name')

        if not column_to_drop:
            print("DJANGO PUT: Error - No column_name provided.")
            return Response({"error": "No column_name provided to drop."}, status=status.HTTP_400_BAD_REQUEST)

        df = self._get_df_from_session(request)
        filename = request.session.get('current_filename')

        if df is None: 
            return Response({"error": "No active DataFrame in session. Please upload a file first."}, status=status.HTTP_400_BAD_REQUEST)
        if filename is None: 
             print("DJANGO PUT: Error - 'current_filename' not found in session, though DataFrame exists.")
             return Response({"error": "Session inconsistency: Filename missing. Please re-upload."}, status=status.HTTP_400_BAD_REQUEST)

        print(f"DJANGO PUT: DataFrame columns before drop: {df.columns.tolist()}")
        if column_to_drop not in df.columns:
            print(f"DJANGO PUT: Column '{column_to_drop}' not found in DataFrame.")
            response_data = self._prepare_preview_response(df, filename, f"Column '{column_to_drop}' not found in the current data.")
            self._save_df_to_session(request, df, filename) 
            return Response(response_data, status=status.HTTP_200_OK)

        try:
            df.drop(columns=[column_to_drop], inplace=True)
            print(f"DJANGO PUT: DataFrame columns after drop: {df.columns.tolist()}")
            self._save_df_to_session(request, df, filename) 

            response_data = self._prepare_preview_response(df, filename, f"Column '{column_to_drop}' dropped successfully.")
            print("DJANGO PUT: Prepared response, returning to client.")
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"DJANGO PUT: Error during df.drop or save: {e}")
            traceback.print_exc()
            return Response({"error": f"Error dropping column: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    def get(self, request, *args, **kwargs):
        print(f"DJANGO GET: Received request. Path: {request.path}, Session ID: {request.session.session_key}")
        print(f"DJANGO GET: kwargs from URL: {kwargs}")

        df = self._get_df_from_session(request)
        filename_in_session = request.session.get('current_filename')

        download_format = kwargs.get('download_format') 

        if df is None or filename_in_session is None:
            if download_format: 
                print(f"DJANGO GET ({download_format.upper()} Download): Error - No active data to download.")
                return Response({"error": "No active data to download. Please upload a file first."}, status=status.HTTP_404_NOT_FOUND)
            else: 
                print("DJANGO GET (Preview): No complete active data session found for preview.")
                return Response(self._prepare_preview_response(None, None, "No active data session found."), status=status.HTTP_200_OK)

        if download_format: 
            try:
                try:
                    base_name, original_ext = filename_in_session.rsplit('.', 1)
                except ValueError: 
                    base_name = filename_in_session
                output_filename = f"{base_name}_cleaned.{download_format}"

                if download_format == 'xlsx':
                    buffer = io.BytesIO()
                    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                        df.to_excel(writer, index=False, sheet_name='Sheet1')
                    file_content = buffer.getvalue()
                    content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                elif download_format == 'csv':
                    string_buffer = io.StringIO()
                    df.to_csv(string_buffer, index=False)
                    file_content = string_buffer.getvalue().encode('utf-8')
                    content_type = 'text/csv'
                else:
                    return Response({"error": "Internal server error: Invalid download format specified."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                response = HttpResponse(file_content, content_type=content_type)
                response['Content-Disposition'] = f'attachment; filename="{output_filename}"'
                print(f"DJANGO GET ({download_format.upper()} Download): Sending file '{output_filename}'")
                return response

            except Exception as e:
                print(f"DJANGO GET ({download_format.upper()} Download): Error preparing file: {e}")
                traceback.print_exc()
                return Response({"error": f"Server error preparing file for download: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            response_data = self._prepare_preview_response(df, filename_in_session, "Current data preview retrieved.")
            print("DJANGO GET (Preview): Prepared response, returning to client.")
            return Response(response_data, status=status.HTTP_200_OK)

# ------------------------------------
# Missing value operations
# ------------------------------------

# Fill missing values - mean, median, mode, constant
class ReplaceMissingValuesView(Helpers, APIView): # Assuming Helpers is your DataFrameSessionMixin
    parser_classes = [JSONParser]

    def post(self, request, *args, **kwargs): 
        print(f"DJANGO ReplaceMissingValuesView POST: Received request. Session ID: {request.session.session_key}")
        print(f"DJANGO ReplaceMissingValuesView POST: Request data: {request.data}")

        df = self._get_df_from_session(request)
        filename = self._get_current_filename_from_session(request)

        if df is None or filename is None:
            print("DJANGO ReplaceMissingValuesView POST: No active DataFrame or filename in session.")
            return Response({"error": "No active data session. Please upload a file first."}, status=status.HTTP_400_BAD_REQUEST)

        fill_strategy = request.data.get('fill_strategy') # Expect 'fill_strategy' from frontend
        columns_to_fill = request.data.get('columns_to_fill') # Expect 'columns_to_fill' as a list

        if not fill_strategy:
            return Response({"error": "Missing 'fill_strategy' parameter."}, status=status.HTTP_400_BAD_REQUEST)
        if not columns_to_fill or not isinstance(columns_to_fill, list):
            return Response({"error": "Missing or invalid 'columns_to_fill' parameter. It should be a list of column names."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate that all specified columns exist in the DataFrame
        for col in columns_to_fill:
            if col not in df.columns:
                return Response({"error": f"Column '{col}' not found in the data."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df_cleaned = df.copy()
            message_parts = []

            if fill_strategy.lower() == 'mean':
                for column_name in columns_to_fill:
                    if pd.api.types.is_numeric_dtype(df_cleaned[column_name]):
                        col_mean = df_cleaned[column_name].mean()
                        df_cleaned[column_name] = df[column_name].fillna(col_mean)
                        message_parts.append(f"Column '{column_name}' filled with its mean ({col_mean:.2f}).")
                    else:
                        message_parts.append(f"Column '{column_name}' is not numeric; mean imputation skipped.")
            ### Add elif for 'median', 'mode', 'constant' here later
 
            else:
                return Response({"error": f"Unsupported fill strategy: '{fill_strategy}'."}, status=status.HTTP_400_BAD_REQUEST)

            self._save_df_to_session(request, df_cleaned) # Save the modified DataFrame
            
            final_message = "Missing values processed. " + " ".join(message_parts)
            if not message_parts: # Should not happen if strategy is valid
                 final_message = "No changes made or strategy not fully implemented."

            print(f"DJANGO ReplaceMissingValuesView POST: {final_message}")
            response_data = self._prepare_preview_response(df_cleaned, filename, final_message)
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"DJANGO ReplaceMissingValuesView POST: Error replacing missing values: {e}")
            traceback.print_exc()
            return Response({"error": f"An error occurred while replacing missing values: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Drop rows with missing values - ANY or ALL
class HandleMissingRowsView(Helpers, APIView):
    parser_classes = [JSONParser]

    def post(self, request, *args, **kwargs):
        print(f"DJANGO HandleMissingRowsView POST: Received request. Session ID: {request.session.session_key}")
        print(f"DJANGO HandleMissingRowsView POST: Request data: {request.data}")

        df = self._get_df_from_session(request)
        filename = self._get_current_filename_from_session(request)

        if df is None or filename is None:
            print("DJANGO HandleMissingRowsView POST: No active DataFrame or filename in session.")
            return Response({"error": "No active data session. Please upload a file first."}, status=status.HTTP_400_BAD_REQUEST)

        # Get the strategy from the request data, default to 'any' if not provided
        # 'any': drop row if any NA values are present
        # 'all': drop row only if all values are NA
        drop_strategy = request.data.get('strat', 'any').lower()

        if drop_strategy not in ['any', 'all']:
            return Response({"error": "Invalid 'strategy' parameter. Must be 'any' or 'all'."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            original_row_count = len(df)
            # Apply dropna with the specified strategy
            df_cleaned = df.dropna(how=drop_strategy, axis=0) # axis=0 for rows
            rows_dropped = original_row_count - len(df_cleaned)

            self._save_df_to_session(request, df_cleaned) # Save the modified DataFrame

            strategy_desc = "any missing values" if drop_strategy == 'any' else "all missing values"
            message = f"{rows_dropped} row(s) with {strategy_desc} dropped successfully."
            if rows_dropped == 0:
                message = f"No rows found with {strategy_desc} to drop."
            
            print(f"DJANGO HandleMissingRowsView POST: {message}")
            response_data = self._prepare_preview_response(df_cleaned, filename, message)
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"DJANGO HandleMissingRowsView POST: Error processing missing rows: {e}")
            traceback.print_exc()
            return Response({"error": f"An error occurred while processing missing rows: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -----------------
# Filtering
# -----------------

class FilterRowsView(Helpers, APIView):
    parser_classes = [JSONParser]

    def post(self, request, *args, **kwargs):
        print(f"DJANGO FilterRowsView POST: Received request. Session ID: {request.session.session_key}")
        print(f"DJANGO FilterRowsView POST: Request data: {request.data}")

        df = self._get_df_from_session(request)
        filename = self._get_current_filename_from_session(request)

        if df is None or filename is None:
            print("DJANGO FilterRowsView POST: No active DataFrame or filename in session.")
            return Response({"error": "No active data session. Please upload a file first."}, status=status.HTTP_400_BAD_REQUEST)

        column_name = request.data.get('column_name')
        operator = request.data.get('operator')
        value_to_filter = request.data.get('value') # This will be a string from JSON

        if not all([column_name, operator, value_to_filter is not None]): # value_to_filter can be 0 or False
            return Response({"error": "Missing parameters: column_name, operator, or value required."}, status=status.HTTP_400_BAD_REQUEST)

        if column_name not in df.columns:
            return Response({"error": f"Column '{column_name}' not found in the data."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            original_row_count = len(df)
            col_dtype = df[column_name].dtype  
            filtered_df = df.copy() 

            if operator in ['>', '>=', '<', '<=']:
                try:
                    # Try to convert both column and value to numeric for comparison
                    ### This might raise errors if conversion isn't possible
                    numeric_column = pd.to_numeric(filtered_df[column_name], errors='coerce')
                    numeric_value = float(value_to_filter) # Or int?

                    if operator == '>':
                        filtered_df = filtered_df[numeric_column > numeric_value]
                    elif operator == '>=':
                        filtered_df = filtered_df[numeric_column >= numeric_value]
                    elif operator == '<':
                        filtered_df = filtered_df[numeric_column < numeric_value]
                    elif operator == '<=':
                        filtered_df = filtered_df[numeric_column <= numeric_value]
                except ValueError:
                    return Response({"error": f"Cannot perform numeric comparison on column '{column_name}' with value '{value_to_filter}'. Ensure data types are compatible."}, status=status.HTTP_400_BAD_REQUEST)
            
            elif operator == '==':
                # For equality, try to match type if possible, otherwise string comparison
                try:
                    if pd.api.types.is_numeric_dtype(col_dtype):
                        typed_value = pd.to_numeric(value_to_filter)
                        filtered_df = filtered_df[pd.to_numeric(filtered_df[column_name], errors='coerce') == typed_value]
                    elif pd.api.types.is_datetime64_any_dtype(col_dtype):
                        typed_value = pd.to_datetime(value_to_filter)
                        filtered_df = filtered_df[pd.to_datetime(filtered_df[column_name], errors='coerce') == typed_value]
                    elif pd.api.types.is_bool_dtype(col_dtype):
                        typed_value = str(value_to_filter).lower() in ['true', '1', 'yes']
                        # Be careful with boolean conversion from string
                        bool_series = filtered_df[column_name].astype(str).str.lower().isin(['true', '1', 'yes'])
                        filtered_df = filtered_df[bool_series == typed_value]
                    else: # Default to string comparison
                        filtered_df = filtered_df[filtered_df[column_name].astype(str) == str(value_to_filter)]
                except Exception as e_conv:
                     print(f"Type conversion error for '==' operator: {e_conv}")
                     # Fallback to string comparison if conversion fails
                     filtered_df = filtered_df[filtered_df[column_name].astype(str) == str(value_to_filter)]

            elif operator == '!=':
                try:
                    if pd.api.types.is_numeric_dtype(col_dtype):
                        typed_value = pd.to_numeric(value_to_filter)
                        filtered_df = filtered_df[pd.to_numeric(filtered_df[column_name], errors='coerce') != typed_value]
                    elif pd.api.types.is_datetime64_any_dtype(col_dtype):
                        typed_value = pd.to_datetime(value_to_filter)
                        filtered_df = filtered_df[pd.to_datetime(filtered_df[column_name], errors='coerce') != typed_value]
                    elif pd.api.types.is_bool_dtype(col_dtype):
                        typed_value = str(value_to_filter).lower() in ['true', '1', 'yes']
                        bool_series = filtered_df[column_name].astype(str).str.lower().isin(['true', '1', 'yes'])
                        filtered_df = filtered_df[bool_series != typed_value]
                    else: # Default to string comparison
                        filtered_df = filtered_df[filtered_df[column_name].astype(str) != str(value_to_filter)]
                except Exception as e_conv:
                     print(f"Type conversion error for '!=' operator: {e_conv}")
                     filtered_df = filtered_df[filtered_df[column_name].astype(str) != str(value_to_filter)]

            elif operator == 'contains':
                if pd.api.types.is_string_dtype(col_dtype) or col_dtype == object :
                    # Ensure column is string type for .str accessor
                    filtered_df = filtered_df[filtered_df[column_name].astype(str).str.contains(str(value_to_filter), case=False, na=False)]
                else:
                    return Response({"error": "'contains' operator is only for text columns."}, status=status.HTTP_400_BAD_REQUEST)
            
            elif operator == 'not_contains':
                if pd.api.types.is_string_dtype(col_dtype) or col_dtype == object :
                    filtered_df = filtered_df[~filtered_df[column_name].astype(str).str.contains(str(value_to_filter), case=False, na=False)]
                else:
                    return Response({"error": "'not_contains' operator is only for text columns."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"error": f"Unsupported operator: '{operator}'."}, status=status.HTTP_400_BAD_REQUEST)

            rows_remaining = len(filtered_df)
            rows_filtered_out = original_row_count - rows_remaining

            self._save_df_to_session(request, filtered_df)

            message = f"{rows_filtered_out} row(s) filtered out based on condition: '{column_name} {operator} {value_to_filter}'. {rows_remaining} row(s) remaining."
            if rows_filtered_out == 0 :
                 message = f"No rows met the filter condition to be removed: '{column_name} {operator} {value_to_filter}'. All {original_row_count} rows remain."
            
            print(f"DJANGO FilterRowsView POST: {message}")
            response_data = self._prepare_preview_response(filtered_df, filename, message)
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"DJANGO FilterRowsView POST: Error filtering rows: {e}")
            traceback.print_exc()
            return Response({"error": f"An error occurred while filtering rows: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------------
# Encoding operations
# -----------------------------

# Label & One-Hot Encoding 
class EncodingView(Helpers, APIView):
    parser_classes = JSONParser

    def post(self, request, *args, **kwargs):
        df = self._get_df_from_session(request)
        filename = self._get_current_filename_from_session(request)

        if df is None or filename is None:
            print("DJANGO ReplaceMissingValuesView POST: No active DataFrame or filename in session.")
            return Response({"error": "No active data session. Please upload a file first."}, status=status.HTTP_400_BAD_REQUEST)
        
        strat = request.data.get('strat') # get the encoding strategy 
        categorical_cols = request.data.get('categorical-cols') # expect the categorical columns as a list
        if strat not in ['label', 'one-hot']: # validate encoding strategy
            return Response({"error": "Invalid 'strategy' parameter. Must be 'label' or 'one-hot'."}, status=status.HTTP_400_BAD_REQUEST)
        if not categorical_cols or not isinstance(categorical_cols, list):
            return Response({"error": "Missing or invalid 'categorical_cols' parameter. It should be a list of column names."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # label encoding
            df_cleaned = df.copy()
            if strat == 'label':
                # Initialize LabelEncoder
                label_encoder = LabelEncoder()              

                # Apply Label Encoding to each categorical column
                for col in categorical_cols:
                    df_cleaned[col] = label_encoder.fit_transform(df_cleaned[col])
            elif strat == 'one-hot':
                # Apply One Hot Encoding to each categorical column
                df_cleaned = pd.get_dummies(df_cleaned, columns=categorical_cols)
            else:
                return Response({"error": "Missing or invalid 'strat' parameter."}, status=status.HTTP_400_BAD_REQUEST)
            # Save to session
            self._save_df_to_session(request, df_cleaned)
        except Exception as e:
            print(f"DJANGO FilterRowsView POST: Error encoding cols: {e}")
            traceback.print_exc()
            return Response({"error": f"An error occurred while encoding data: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

