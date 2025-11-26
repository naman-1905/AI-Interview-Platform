import React, { useState } from 'react';

export default function ApplicationForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    resume: null
  });
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    if (file) {
      const fileType = file.type;
      if (fileType === 'application/pdf' || 
          fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          fileType === 'application/msword') {
        setFormData(prev => ({
          ...prev,
          resume: file
        }));
        setMessage('');
      } else {
        setMessage('Please upload only PDF or DOCX files');
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    validateAndSetFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.resume) {
      setMessage('Please fill all the fields');
      return;
    }

    const submitData = new FormData();
    submitData.append('firstName', formData.firstName);
    submitData.append('lastName', formData.lastName);
    submitData.append('email', formData.email);
    submitData.append('phone', formData.phone);
    submitData.append('resume', formData.resume);

    try {
      // TODO: Replace with your actual API endpoint
      const response = await fetch('YOUR_API_ENDPOINT_HERE', {
        method: 'POST',
        body: submitData
      });

      if (response.ok) {
        setMessage('Application submitted successfully');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          resume: null
        });
        document.getElementById('resumeInput').value = '';
      } else {
        setMessage('Submission failed. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen p-10 font-sans flex items-center">
      <div className="max-w-2xl mx-auto border  bg-white rounded-2xl p-12 shadow-2xl">
        <h2 className="text-4xl text-center font-bold text-gray-800 mb-2">
          AI Interview Session
        </h2>
        <p className="text-gray-500 text-base font-medium mb-8">
          Fill in your details to attempt the interview
        </p>

        <div className="grid grid-cols-2 gap-5 mb-5">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              placeholder="Naman"
              value={formData.firstName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="lastName"
              placeholder="Chaturvedi"
              value={formData.lastName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            placeholder="john.doe@example.com"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all outline-none focus:border-blue-500"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all outline-none focus:border-blue-500"
          />
        </div>

        <div className="mb-7">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Resume <span className="text-red-500">*</span>
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-50' 
                : 'border-gray-300 bg-gray-50'
            }`}
            onClick={() => document.getElementById('resumeInput').click()}
          >
            <input
              id="resumeInput"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <svg
              className="w-12 h-12 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>

            {formData.resume ? (
              <div>
                <p className="mb-1 text-base font-semibold text-green-600">
                  ✓ {formData.resume.name}
                </p>
                <p className="text-sm text-gray-500">
                  Click to change file
                </p>
              </div>
            ) : (
              <div>
                <p className="mb-1 text-base font-medium text-gray-700">
                  Drop your resume here or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  PDF or DOCX (Max 10MB)
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-3.5 bg-blue-800 text-white rounded-lg font-semibold cursor-pointer hover:bg-blue-900"
        >
          Submit Application
        </button>

        {message && (
          <div className={`mt-5 px-4 py-3.5 rounded-lg text-sm font-medium ${
            message.includes('success')
              ? 'bg-green-100 border border-green-300 text-green-800'
              : 'bg-red-100 border border-red-300 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}