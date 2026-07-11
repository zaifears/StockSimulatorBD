import React from 'react';
import { UserProfile } from '../../lib/firebase';

interface ProfileEditFormProps {
  formData: UserProfile;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

function ProfileEditForm({ formData, onInputChange }: ProfileEditFormProps) {
  const profileWebMcpSchema = {
    tools: [
      {
        name: "update_profile",
        description: "Update the user's profile information.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Full name" },
            age: { type: "integer", description: "Age" },
            status: { type: "string", description: "Current occupational status" }
          }
        }
      }
    ]
  };

  return (
  <form onSubmit={(e) => e.preventDefault()} className="max-w-md mx-auto space-y-4 animate-fade-in-up">
    {/* WebMCP Schema Injection */}
    <script 
      type="application/webmcp+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(profileWebMcpSchema) }}
    />
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Profile</h2>
    
    <input 
      type="text" 
      name="name" 
      value={formData.name || ''} 
      onChange={onInputChange} 
      placeholder="Your Full Name" 
      className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-500 dark:placeholder-gray-400"
    />
    
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <input 
        type="number" 
        name="age" 
        value={formData.age || ''} 
        onChange={onInputChange} 
        placeholder="Your Age" 
        className="p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-500 dark:placeholder-gray-400"
      />
      
      <select 
        name="status" 
        value={formData.status || ''} 
        onChange={onInputChange} 
        className="p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
      >
        <option value="">Select Status...</option>
        <option value="School">School (Class 1-10)</option>
        <option value="College">College (Class 11-12)</option>
        <option value="University">University</option>
        <option value="Job">In a Job</option>
        <option value="Other">Other</option>
      </select>
    </div>
  </form>
  );
}

ProfileEditForm.displayName = 'ProfileEditForm';
export default React.memo(ProfileEditForm);
