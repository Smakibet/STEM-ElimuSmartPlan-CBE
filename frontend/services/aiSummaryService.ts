import axios from 'axios';

export const generateAppraisalSummary = async (sessionId: string) => {
    const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/ai/appraisal-summary`,
        { sessionId }
    );
    return res.data.summary;
};
