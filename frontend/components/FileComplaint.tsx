'use client';

import { useState } from 'react';
import { useComplaintAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Camera, XCircle } from 'lucide-react';

interface FileComplaintProps {
  onSuccess?: () => void;
}

export default function FileComplaint({ onSuccess }: FileComplaintProps) {
  const router = useRouter();
  const complaintAPI = useComplaintAPI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    ward_number: 44,
    priority: 'medium',
    location: null as { latitude: number; longitude: number } | null,
  });

  const MAX_FILES = 5;
  const MAX_FILE_SIZE_MB = 5;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newFiles: File[] = [];
      const newPreviews: string[] = [];

      filesArray.forEach(file => {
        if (selectedFiles.length + newFiles.length >= MAX_FILES) {
          setError(`Maximum ${MAX_FILES} images allowed.`);
          return;
        }
        if (!file.type.startsWith('image/')) {
          setError('Only image files are allowed.');
          return;
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          setError(`Image size must be less than ${MAX_FILE_SIZE_MB}MB.`);
          return;
        }

        newFiles.push(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === newFiles.length) {
            setSelectedFiles(prev => [...prev, ...newFiles]);
            setImagePreviews(prev => [...prev, ...newPreviews]);
            setError(null);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const attachments: string[] = [];
      for (const file of selectedFiles) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
          reader.readAsDataURL(file);
        });
        attachments.push(base64);
      }

      const result = await complaintAPI.fileComplaint({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        ward_number: formData.ward_number,
        priority: formData.priority,
        location: formData.location,
        attachments: attachments,
      });

      setComplaintId(result.complaint_id);
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => {
          router.push(`/complaints/track/${result.complaint_id}`);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to file complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          });
        },
        (err) => {
          console.error("Error getting location:", err);
          setError("Failed to get current location.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">File a New Complaint</h2>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          Complaint filed successfully! Your ID is: <span className="font-mono font-semibold">{complaintId}</span>. Redirecting...
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Severe waterlogging near XYZ market"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Provide detailed information about the waterlogging incident..."
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Category</option>
              <option value="Waterlogging">Waterlogging</option>
              <option value="Drainage Issue">Drainage Issue</option>
              <option value="Road Damage">Road Damage</option>
              <option value="Garbage Accumulation">Garbage Accumulation</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="ward_number" className="block text-sm font-medium text-gray-700 mb-2">
              Ward Number
            </label>
            <input
              type="number"
              id="ward_number"
              value={formData.ward_number}
              onChange={(e) => setFormData({ ...formData, ward_number: parseInt(e.target.value) })}
              required
              min="1"
              max="272"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location (Optional)
          </label>
          <button
            type="button"
            onClick={getCurrentLocation}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {formData.location ? '✓ Location Captured' : 'Use Current Location'}
          </button>
          {formData.location && (
            <p className="mt-2 text-sm text-gray-600">
              Lat: {formData.location.latitude.toFixed(6)}, Lng: {formData.location.longitude.toFixed(6)}
            </p>
          )}
        </div>

        {/* Photo Upload Section */}
        <div>
          <label htmlFor="attachments" className="block text-sm font-medium text-gray-700 mb-2">
            Photos (Optional, max {MAX_FILES})
          </label>
          <input
            type="file"
            id="attachments"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {imagePreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden shadow-md">
                  <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600"
                    aria-label="Remove image"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Filing Complaint...' : 'File Complaint'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
