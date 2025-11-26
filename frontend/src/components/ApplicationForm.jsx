import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const fields = [
  { name: "firstName", label: "First Name", placeholder: "Naman" },
  { name: "lastName", label: "Last Name", placeholder: "Chaturvedi" },
  { name: "email", label: "Email", type: "email", placeholder: "john@example.com" },
  { name: "phone", label: "Phone Number", placeholder: "+91 9999999999" },
];

const validFileTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

function SkeletonLoader() {
  return (
    <div className="min-h-screen p-10 flex items-center bg-gray-50">
      <div className="max-w-2xl mx-auto w-full bg-white p-10 rounded-2xl shadow-xl">
        {/* Title skeleton */}
        <div className="h-10 bg-gray-200 rounded-lg w-3/4 mx-auto mb-2 animate-pulse" />
        <div className="h-5 bg-gray-200 rounded-lg w-1/2 mx-auto mb-8 animate-pulse" />

        {/* First row - two fields */}
        <div className="grid grid-cols-2 gap-5 mb-6">
          {[1, 2].map((i) => (
            <div key={i} className="mb-5">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" />
              <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>

        {/* Second row - two full width fields */}
        {[1, 2].map((i) => (
          <div key={i} className="mb-5">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2 animate-pulse" />
            <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        ))}

        {/* File upload skeleton */}
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2 animate-pulse" />
        <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />

        {/* Button skeleton */}
        <div className="h-12 bg-gray-200 rounded-lg mt-6 animate-pulse" />
      </div>
    </div>
  );
}

export default function ApplicationForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", resume: null
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const updateField = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const setFile = (file) => {
    if (!file) return;
    if (!validFileTypes.includes(file.type))
      return setMessage("Upload only PDF or DOCX");

    setForm({ ...form, resume: file });
    setMessage("");
  };

  const submit = async () => {
    if (Object.values(form).includes("") || !form.resume)
      return setMessage("Please fill all fields");

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));

    try {
      const res = await fetch("YOUR_API_ENDPOINT_HERE", { method: "POST", body: data });

      if (!res.ok) return setMessage("Submission failed. Try again.");

      setMessage("Application submitted successfully!");
      setTimeout(() => navigate("/queue"), 1000);

    } catch {
      setMessage("Error submitting form");
    }
  };

  if (loading) return <SkeletonLoader />;

  return (
    <div className="min-h-screen p-10 flex items-center bg-gray-50">
      <div className="max-w-2xl mx-auto w-full bg-white p-10 rounded-2xl shadow-xl">

        <h2 className="text-4xl font-bold text-center mb-1">AI Interview Session</h2>
        <p className="text-gray-500 text-center mb-8">Fill your details to continue</p>

        {/* Input Fields */}
        <div className="grid grid-cols-2 gap-5">
          {fields.slice(0, 2).map(({ name, label, placeholder, type }) => (
            <Input key={name} label={label} name={name} placeholder={placeholder} type={type} value={form[name]} onChange={updateField} />
          ))}
        </div>

        {fields.slice(2).map(({ name, label, placeholder, type }) => (
          <Input key={name} label={label} name={name} placeholder={placeholder} type={type} value={form[name]} onChange={updateField} />
        ))}

        {/* File Upload */}
        <label className="block mb-2 font-medium text-gray-700">Resume *</label>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            dragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-gray-50"
          }`}
          onClick={() => document.getElementById("file").click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); setFile(e.dataTransfer.files[0]); }}
        >
          <input id="file" type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files[0])} />
          {form.resume ? (
            <p className="text-green-600 font-semibold">✓ {form.resume.name}</p>
          ) : (
            <>
              <p className="font-medium">Drop resume or click to upload</p>
              <p className="text-sm text-gray-500">PDF or DOCX only</p>
            </>
          )}
        </div>

        {/* Button */}
        <button onClick={submit} className="w-full mt-6 py-3 bg-blue-700 hover:bg-blue-900 text-white rounded-lg font-semibold transition">
          Submit Application
        </button>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${message.includes("success")
            ? "bg-green-100 text-green-700 border border-green-300"
            : "bg-red-100 text-red-700 border border-red-300"
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, name, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="mb-5">
      <label className="block mb-2 text-sm font-medium text-gray-700">{label} *</label>
      <input
        name={name}
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={onChange}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
      />
    </div>
  );
}