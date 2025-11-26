import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const fields = [
  { name: "firstName", label: "First Name", placeholder: "Naman" },
  { name: "lastName", label: "Last Name", placeholder: "Chaturvedi" },
  { name: "email", label: "Email", type: "email", placeholder: "john@example.com" },
  { name: "phone", label: "Phone Number", placeholder: "+91 9999999999" },
];

const validFileTypes = ["application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const apiEndpoint = import.meta.env.VITE_API_ENDPOINT;

export default function ApplicationForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", resume: null });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  const updateField = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const setFile = (file) => {
    if (!file) return;
    if (!validFileTypes.includes(file.type)) return setMessage("Upload only PDF or DOCX files");

    setMessage("");
    setForm({ ...form, resume: file });
  };

  const submit = async () => {
    if (Object.values(form).includes("") || !form.resume)
      return setMessage("Please fill all fields");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return setMessage("Please enter a valid email");

    setSubmitting(true);
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`), v));

    try {
      const res = await fetch(`${apiEndpoint}/users/`, { method: "POST", body: data });
      const response = await res.json();

      if (!res.ok) {
        setMessage(response.message || "Submission failed");
        return setSubmitting(false);
      }

      ["user_id", "queue_number", "status", "resume_path"].forEach(key =>
        localStorage.setItem(key, response[key])
      );

      navigate("/queue", { state: response });
    } catch {
      setMessage("Network error, please try again.");
    }

    setSubmitting(false);
  };

  if (loading) return <SkeletonLoader />;

  return (
    <Wrapper>
      <Title />
      <div className="grid grid-cols-2 gap-5">
        {fields.slice(0, 2).map(props => <Input key={props.name} {...props} value={form[props.name]} onChange={updateField} disabled={submitting} />)}
      </div>

      {fields.slice(2).map(props => <Input key={props.name} {...props} value={form[props.name]} onChange={updateField} disabled={submitting} />)}

      <FileUpload file={form.resume} setFile={setFile} disabled={submitting} />

      <button
        onClick={submit}
        disabled={submitting}
        className={`w-full mt-6 py-3 rounded-lg text-white font-semibold transition ${submitting ? "bg-gray-400" : "bg-blue-700 hover:bg-blue-900"}`}
      >
        {submitting ? "Submitting..." : "Submit Application"}
      </button>

      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${message.includes("success") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message}
        </div>
      )}
    </Wrapper>
  );
}

/* ------- Small Reusable Components -------- */

const Wrapper = ({ children }) => (
  <div className="min-h-screen p-10 flex items-center bg-gray-50">
    <div className="max-w-2xl mx-auto w-full bg-white p-10 rounded-2xl shadow-xl">
      {children}
    </div>
  </div>
);

const Title = () => (
  <>
    <h2 className="text-4xl font-bold text-center mb-1">AI Interview Session</h2>
    <p className="text-gray-500 text-center mb-8">Fill your details to continue</p>
  </>
);

const Input = ({ label, name, value, onChange, placeholder, type = "text", disabled }) => (
  <div className="mb-5">
    <label className="block mb-2 text-sm font-medium">{label} *</label>
    <input {...{ name, type, value, onChange, placeholder, disabled }}
      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 outline-none disabled:bg-gray-100" />
  </div>
);

const FileUpload = ({ file, setFile, disabled }) => (
  <div className="mb-5">
    <label className="block mb-2 text-sm font-medium">Resume *</label>
    <div
      onClick={() => !disabled && document.getElementById("file").click()}
      className={`border border-gray-400 border-dashed rounded-lg p-6 text-center cursor-pointer ${disabled && "opacity-50"}`}
    >
      <input id="file" type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files[0])} disabled={disabled} />
      {file ? <p className="text-green-600">✓ {file.name}</p> : <p>Drop or click to upload (DOCX)</p>}
    </div>
  </div>
);

/* Skeleton Loader stays same */
function SkeletonLoader() {
  return <div className="animate-pulse text-center p-20">Loading...</div>;
}
