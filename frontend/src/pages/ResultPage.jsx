import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from '../components/Navbar'
import SWOT from '../components/SWOT'

function ResultPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // When user tries to go back, push them back here
    window.history.pushState(null, "", window.location.href);

    const preventBack = () => {
      navigate("/result", { replace: true });
    };

    window.addEventListener("popstate", preventBack);

    return () => {
      window.removeEventListener("popstate", preventBack);
    };
  }, [navigate]);

  return (
    <div>
      <Navbar/>
      <SWOT/>
    </div>
  );
}

export default ResultPage;
