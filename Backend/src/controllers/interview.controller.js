const pdfParse = require("pdf-parse")
const { generateInterviewReport , generateResumePdf} = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")




/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({
            message: "A PDF resume file is required."
        })
    }

    const { selfDescription, jobDescription } = req.body

    if (!selfDescription || !jobDescription) {
        return res.status(400).json({
            message: "Self description and job description are required."
        })
    }

    try {
        const resumeContent = await pdfParse(req.file.buffer)
        const resumeText = resumeContent?.text || ""

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription,
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription,
            jobDescription,
            ...interViewReportByAi
        })

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (error) {
        return res.status(400).json({
            message: "Unable to parse the uploaded resume PDF.",
            error: error.message
        })
    }

}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    const interviewReport = await interviewReportModel.findById(interviewReportId)

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    if (interviewReport.user?.toString() !== req.user.id) {
        return res.status(403).json({
            message: "You are not authorized to access this interview report."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    try {
        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        })

        return res.send(pdfBuffer)
    } catch (error) {
        return res.status(500).json({
            message: "Unable to generate resume PDF.",
            error: error.message
        })
    }
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController , getAllInterviewReportsController, generateResumePdfController  } 