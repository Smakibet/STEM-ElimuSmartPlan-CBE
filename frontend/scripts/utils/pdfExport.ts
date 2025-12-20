import jsPDF from 'jspdf';

export const exportTPADPdf = (session: any, teacherName: string) => {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text('TSC TPAD APPRAISAL REPORT', 20, 20);

    doc.setFontSize(10);
    doc.text(`Teacher: ${teacherName}`, 20, 30);
    doc.text(`Term: ${session.term}`, 20, 36);
    doc.text(`Year: ${session.year}`, 20, 42);
    doc.text(`Status: ${session.status}`, 20, 48);

    let y = 60;

    session.standards.forEach((s: any) => {
        doc.text(`Standard ${s.id}`, 20, y);
        doc.text(`Teacher Rating: ${s.selfRating}`, 30, y + 6);
        doc.text(`Supervisor Rating: ${s.supervisorRating || '-'}`, 30, y + 12);
        y += 22;
    });

    doc.save(`TPAD_${teacherName}_${session.year}.pdf`);
};
