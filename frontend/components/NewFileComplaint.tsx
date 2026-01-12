"use client";

import { useState, useCallback } from "react";
import { useComplaintAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { 
  Camera, 
  XCircle, 
  MapPin, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import {
  ComplaintFormData,
  ComplaintPriority,
  COMPLAINT_CATEGORIES,
  PRIORITY_LABELS,
  LocationData
} from "@/types/complaint";

interface NewFileComplaintProps {
  onSuccess?: (complaintId: string) => void;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function NewFileComplaint({ onSuccess }: NewFileComplaintProps) {
  const router = useRouter();
  const complaintAPI = useComplaintAPI();

  // Form state
  const [formData, setFormData] = useState<ComplaintFormData>({
    title: "",
    description: "",
    category: "",
    ward_number: 44,
    priority: ComplaintPriority.MEDIUM,
    location: null,
    attachments: [],
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Validation state
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Field validation
  const validateField = (name: string, value: any): string | null => {
    switch (name) {
      case "title":
        if (!value || value.trim().length < 5) {
          return "Title must be at least 5 characters";
        }
        if (value.trim().length > 200) {
          return "Title must not exceed 200 characters";
        }
        return null;
      case "description":
        if (!value || value.trim().length < 10) {
          return "Description must be at least 10 characters";
        }
        if (value.trim().length > 2000) {
          return "Description must not exceed 2000 characters";
        }
        return null;
      case "category":
        if (!value) {
          return "Please select a category";
        }
        return null;
      case "ward_number":
        const wardNum = parseInt(value);
        if (isNaN(wardNum) || wardNum < 1 || wardNum > 272) {
          return "Ward number must be between 1 and 272";
        }
        return null;
      default:
        return null;
    }
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    setError(null);
  };

  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setFormData((prev) => ({ ...prev, location }));
        setLocationLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        let errorMessage = "Failed to get location. ";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage += "Please enable location permissions.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case err.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
        }
        setError(errorMessage);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // File upload handlers
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;

      const filesArray = Array.from(e.target.files);
      const validFiles: File[] = [];
      const previews: string[] = [];
      let errorMsg = "";

      for (const file of filesArray) {
        // Check file count
        if (selectedFiles.length + validFiles.length >= MAX_FILES) {
          errorMsg = `Maximum ${MAX_FILES} images allowed`;
          break;
        }

        // Check file type
        if (!file.type.startsWith("image/")) {
          errorMsg = "Only image files are allowed";
          continue;
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE_BYTES) {
          errorMsg = `Image "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit`;
          continue;
        }

        validFiles.push(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          previews.push(reader.result as string);
          if (previews.length === validFiles.length) {
            setSelectedFiles((prev) => [...prev, ...validFiles]);
            setImagePreviews((prev) => [...prev, ...previews]);
          }
        };
        reader.readAsDataURL(file);
      }

      if (errorMsg) {
        setError(errorMsg);
      } else {
        setError(null);
      }

      // Reset input
      e.target.value = "";
    },
    [selectedFiles]
  );

  const handleRemoveImage = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Convert files to base64
  const convertFilesToBase64 = async (files: File[]): Promise<string[]> => {
    const base64Array: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round(
              ((i + e.loaded / e.total) / files.length) * 100
            );
            setUploadProgress(progress);
          }
        };
        reader.readAsDataURL(file);
      });
      base64Array.push(base64);
    }
    
    return base64Array;
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: string[] = [];

    const titleError = validateField("title", formData.title);
    if (titleError) errors.push(titleError);

    const descError = validateField("description", formData.description);
    if (descError) errors.push(descError);

    const categoryError = validateField("category", formData.category);
    if (categoryError) errors.push(categoryError);

    const wardError = validateField("ward_number", formData.ward_number);
    if (wardError) errors.push(wardError);

    if (errors.length > 0) {
      setError(errors.join(". "));
      return false;
    }

    return true;
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      title: true,
      description: true,
      category: true,
      ward_number: true,
    });

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);

    try {
      // Convert images to base64
      const attachments = selectedFiles.length > 0
        ? await convertFilesToBase64(selectedFiles)
        : [];

      // Prepare payload
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        ward_number: formData.ward_number,
        priority: formData.priority,
        location: formData.location,
        attachments,
      };

      console.log("Filing complaint with payload:", payload);

      // Submit complaint
      const result = await complaintAPI.fileComplaint(payload);

      console.log("Complaint filed successfully:", result);

      // Success!
      setComplaintId(result.complaint_id);
      setSuccess(true);
      setUploadProgress(100);

      // Call success callback or redirect
      if (onSuccess) {
        onSuccess(result.complaint_id);
      } else {
        setTimeout(() => {
          router.push(`/complaints/track/${result.complaint_id}`);
        }, 2000);
      }
    } catch (err: any) {
      console.error("Complaint filing error:", err);
      console.error("Error response:", err.response?.data);

      // Handle different error types
      if (err.response?.status === 422) {
        const validationErrors = err.response?.data?.detail;
        if (Array.isArray(validationErrors)) {
          const errorMessages = validationErrors
            .map((e: any) => {
              const field = e.loc[e.loc.length - 1];
              return `${field}: ${e.msg}`;
            })
            .join(", ");
          setError(`Validation error: ${errorMessages}`);
        } else {
          setError("Invalid data submitted. Please check all fields.");
        }
      } else if (err.response?.status === 503) {
        setError(
          "Service temporarily unavailable. Please check your database connection and try again."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            err.message ||
            "Failed to file complaint. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          File a New Complaint
        </h2>
        <p className="text-gray-600 mb-8">
          Report waterlogging, drainage issues, or other civic problems in your ward
        </p>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 mb-1">
                Error filing complaint
              </h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && complaintId && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-green-900 mb-1">
                Complaint filed successfully!
              </h3>
              <p className="text-sm text-green-700">
                Your complaint ID is:{" "}
                <span className="font-mono font-semibold">{complaintId}</span>
              </p>
              <p className="text-xs text-green-600 mt-1">
                Redirecting to tracking page...
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              onBlur={() => handleBlur("title")}
              disabled={loading}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                touched.title && validateField("title", formData.title)
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              placeholder="e.g., Severe waterlogging near XYZ market"
            />
            {touched.title && validateField("title", formData.title) && (
              <p className="mt-1 text-sm text-red-600">
                {validateField("title", formData.title)}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.title.length}/200 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                handleFieldChange("description", e.target.value)
              }
              onBlur={() => handleBlur("description")}
              disabled={loading}
              rows={5}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
                touched.description &&
                validateField("description", formData.description)
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              placeholder="Provide detailed information about the issue, including landmarks, severity, and any immediate dangers..."
            />
            {touched.description &&
              validateField("description", formData.description) && (
                <p className="mt-1 text-sm text-red-600">
                  {validateField("description", formData.description)}
                </p>
              )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.description.length}/2000 characters
            </p>
          </div>

          {/* Category and Ward - Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleFieldChange("category", e.target.value)}
                onBlur={() => handleBlur("category")}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  touched.category &&
                  validateField("category", formData.category)
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                }`}
              >
                <option value="">Select a category</option>
                {COMPLAINT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {touched.category &&
                validateField("category", formData.category) && (
                  <p className="mt-1 text-sm text-red-600">
                    {validateField("category", formData.category)}
                  </p>
                )}
            </div>

            {/* Ward Number */}
            <div>
              <label
                htmlFor="ward_number"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Ward Number <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="ward_number"
                value={formData.ward_number}
                onChange={(e) =>
                  handleFieldChange("ward_number", parseInt(e.target.value))
                }
                onBlur={() => handleBlur("ward_number")}
                disabled={loading}
                min="1"
                max="272"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  touched.ward_number &&
                  validateField("ward_number", formData.ward_number)
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                }`}
              />
              {touched.ward_number &&
                validateField("ward_number", formData.ward_number) && (
                  <p className="mt-1 text-sm text-red-600">
                    {validateField("ward_number", formData.ward_number)}
                  </p>
                )}
              <p className="mt-1 text-xs text-gray-500">
                Valid range: 1-272
              </p>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(PRIORITY_LABELS).map(([value, { label, color }]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    handleFieldChange("priority", value as ComplaintPriority)
                  }
                  disabled={loading}
                  className={`px-4 py-3 rounded-lg font-medium border-2 transition-all ${
                    formData.priority === value
                      ? `${color} border-current`
                      : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location (Optional)
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={loading || locationLoading}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {locationLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Getting location...
                  </>
                ) : formData.location ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Location Captured
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
                    Use Current Location
                  </>
                )}
              </button>
              {formData.location && (
                <button
                  type="button"
                  onClick={() => handleFieldChange("location", null)}
                  disabled={loading}
                  className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Clear
                </button>
              )}
            </div>
            {formData.location && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Location coordinates captured</p>
                    <p className="text-xs mt-1 font-mono">
                      {formData.location.latitude.toFixed(6)},{" "}
                      {formData.location.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos (Optional, max {MAX_FILES})
            </label>
            <div className="space-y-4">
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  selectedFiles.length >= MAX_FILES
                    ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                    : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Camera className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 font-medium">
                    {selectedFiles.length >= MAX_FILES
                      ? `Maximum ${MAX_FILES} images reached`
                      : "Click to upload photos"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG up to {MAX_FILE_SIZE_MB}MB each
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={loading || selectedFiles.length >= MAX_FILES}
                  className="hidden"
                />
              </label>

              {/* Upload Progress */}
              {loading && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Uploading images...</span>
                    <span className="text-gray-900 font-medium">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative group aspect-square rounded-lg overflow-hidden shadow-md"
                    >
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        disabled={loading}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                        aria-label="Remove image"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                        <p className="text-xs text-white font-medium truncate">
                          {selectedFiles[index]?.name}
                        </p>
                        <p className="text-xs text-white/80">
                          {(selectedFiles[index]?.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Filing Complaint...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  File Complaint
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          {/* Help Text */}
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              <span className="text-red-500">*</span> Required fields
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Your complaint will be assigned to the ward officer for immediate action.
              You'll receive updates via notifications.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}