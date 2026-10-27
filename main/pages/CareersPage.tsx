import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Briefcase,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Code2,
  Palette,
  Smartphone,
  GitBranch,
  Users,
  Zap,
  ArrowLeft,
  Paperclip,
  X,
  FileText,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

const requirements = [
  { icon: Code2, text: 'Strong proficiency in React, TypeScript & modern JavaScript' },
  { icon: Palette, text: 'Experience with Tailwind CSS & component-based design systems' },
  { icon: Smartphone, text: 'Mobile-first, responsive design expertise' },
  { icon: GitBranch, text: 'Familiarity with Git, CI/CD pipelines & agile workflows' },
  { icon: Users, text: 'Excellent communication & team collaboration skills' },
  { icon: Zap, text: 'Passion for performance optimization & clean code' },
]

const responsibilities = [
  'Build and maintain responsive, high-performance web interfaces',
  'Collaborate with designers to translate UI/UX wireframes into pixel-perfect code',
  'Integrate REST and real-time APIs (Supabase, WebSocket)',
  'Write clean, well-documented, and testable code',
  'Participate in code reviews and contribute to architectural decisions',
  'Optimize applications for maximum speed and scalability',
]

interface FormData {
  full_name: string
  email: string
  phone: string
  experience_years: string
  portfolio_url: string
  cover_letter: string
}

const initialFormData: FormData = {
  full_name: '',
  email: '',
  phone: '',
  experience_years: '',
  portfolio_url: '',
  cover_letter: '',
}

export function CareersPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFileChange = (file: File | null) => {
    if (!file) { setResumeFile(null); return }
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) {
      toast.error('Please upload a PDF, DOC, or DOCX file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10 MB')
      return
    }
    setResumeFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.full_name.trim() || !formData.email.trim() || !formData.cover_letter.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!resumeFile) {
      toast.error('Please upload your resume')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setSubmitting(true)

    try {
      
      let resume_url: string | null = null
      if (resumeFile) {
        const ext = resumeFile.name.split('.').pop()
        const fileName = `${Date.now()}_${formData.full_name.trim().replace(/\s+/g, '_')}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, resumeFile, { upsert: false })
        if (uploadError) throw new Error(`Resume upload failed: ${uploadError.message}`)
        const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(uploadData.path)
        resume_url = urlData.publicUrl
      }

      // 2. Save application to DB
      const { error } = await supabase.from('career_applications').insert({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        position: 'Frontend Developer',
        experience_years: parseInt(formData.experience_years) || 0,
        portfolio_url: formData.portfolio_url.trim() || null,
        cover_letter: formData.cover_letter.trim(),
        resume_url,
      })

      if (error) throw error

      // 3. Send email notification via Edge Function
      try {
        const { error: fnError } = await supabase.functions.invoke('send-career-email', {
          body: {
            full_name: formData.full_name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() || 'Not provided',
            position: 'Frontend Developer',
            experience_years: parseInt(formData.experience_years) || 0,
            portfolio_url: formData.portfolio_url.trim() || 'Not provided',
            cover_letter: formData.cover_letter.trim(),
            resume_url: resume_url || 'Not provided',
          },
        })
        if (fnError) console.warn('Email notification failed:', fnError)
      } catch {
        console.warn('Edge function call failed — application still saved')
      }

      setSubmitted(true)
      setFormData(initialFormData)
      setResumeFile(null)
      toast.success('Application submitted successfully!')
    } catch (err: any) {
      console.error('Submission error:', err)
      toast.error(err.message || 'Failed to submit application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center size-20 rounded-full bg-primary/10 mb-6">
          <CheckCircle2 className="size-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">Application Received!</h1>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Thank you for your interest in joining Tournova. We'll review your application and get back to you soon.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
          <Button onClick={() => setSubmitted(false)}>Submit Another</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8 font-sans">
      {/* Back navigation */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-100 transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back to Home
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge className="bg-white/[0.04] text-[#C5A059] border border-[#C5A059]/30 text-[10px] font-semibold tracking-wider uppercase rounded-full flex items-center gap-1.5 px-3 py-1">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            Actively Hiring
          </Badge>
        </div>
        <h1 className="text-3xl font-normal tracking-tight text-stone-100">
          Join <span className="font-editorial italic text-[#C5A059]">Our Team</span>
        </h1>
        <p className="text-stone-400 mt-2 text-sm max-w-lg leading-relaxed">
          We are engineering the premier digital tournament experience. Shape the future of competitive sport with us.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Job Listing — Left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job card */}
          <div className="rounded-3xl club-card border border-white/[0.08] p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="size-11 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#C5A059]">
                <Briefcase className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-stone-100">Frontend Developer</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-white/[0.04] text-stone-300 border-white/[0.08] rounded-full">
                    <Clock className="size-3" />
                    Full-time
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-white/[0.04] text-stone-300 border-white/[0.08] rounded-full">
                    <MapPin className="size-3" />
                    Remote
                  </Badge>
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              We are seeking an exceptional Frontend Developer to engineer and elevate our multi-sport tournament platform using React, TypeScript, and high-performance design architectures.
            </p>
          </div>

          {/* Requirements */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
              Requirements
            </h3>
            <div className="space-y-3">
              {requirements.map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <div className="size-8 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/10 transition-colors">
                    <Icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm text-muted-foreground leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Responsibilities */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
              Responsibilities
            </h3>
            <ul className="space-y-2.5">
              {responsibilities.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Application Form — Right side */}
        <div className="lg:col-span-3">
          <div className="rounded-3xl club-card border border-white/[0.08] p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Send className="size-4.5 text-[#C5A059]" />
              <h2 className="text-lg font-semibold text-stone-100">Apply for Position</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name & Email row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-xs text-stone-300">
                    Full Name <span className="text-[#C5A059]">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    placeholder="Jane Doe"
                    className="bg-white/[0.03] border-white/[0.08] text-stone-100 rounded-full h-11 text-xs sm:text-sm"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs text-stone-300">
                    Email Address <span className="text-[#C5A059]">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="jane@example.com"
                    className="bg-white/[0.03] border-white/[0.08] text-stone-100 rounded-full h-11 text-xs sm:text-sm"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Phone & Experience row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs text-stone-300">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="bg-white/[0.03] border-white/[0.08] text-stone-100 rounded-full h-11 text-xs sm:text-sm"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience_years" className="text-xs text-stone-300">
                    Years of Experience <span className="text-[#C5A059]">*</span>
                  </Label>
                  <Input
                    id="experience_years"
                    name="experience_years"
                    type="number"
                    min="0"
                    max="50"
                    placeholder="3"
                    className="bg-white/[0.03] border-white/[0.08] text-stone-100 rounded-full h-11 text-xs sm:text-sm"
                    value={formData.experience_years}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Portfolio */}
              <div className="space-y-2">
                <Label htmlFor="portfolio_url" className="text-xs text-stone-300">Portfolio / GitHub Profile</Label>
                <Input
                  id="portfolio_url"
                  name="portfolio_url"
                  type="url"
                  placeholder="https://github.com/username"
                  className="bg-white/[0.03] border-white/[0.08] text-stone-100 rounded-full h-11 text-xs sm:text-sm"
                  value={formData.portfolio_url}
                  onChange={handleChange}
                />
              </div>

              {/* Cover Letter */}
              <div className="space-y-2">
                <Label htmlFor="cover_letter" className="text-xs text-stone-300">
                  Candidate Note / Cover Letter <span className="text-[#C5A059]">*</span>
                </Label>
                <Textarea
                  id="cover_letter"
                  name="cover_letter"
                  placeholder="Describe your design and engineering sensibilities, key achievements, and interest in Tournova..."
                  rows={5}
                  className="resize-none bg-white/[0.03] border-white/[0.08] text-stone-100 rounded-2xl text-xs sm:text-sm p-3.5"
                  value={formData.cover_letter}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Resume Upload */}
              <div className="space-y-2">
                <Label className="text-xs text-stone-300">
                  Resume (PDF / DOCX) <span className="text-[#C5A059]">*</span>
                </Label>
                <div
                  className={cn(
                    'relative border border-dashed rounded-2xl p-5 transition-colors cursor-pointer',
                    dragOver
                      ? 'border-[#C5A059] bg-[#C5A059]/5'
                      : resumeFile
                      ? 'border-[#C5A059]/40 bg-white/[0.02]'
                      : 'border-white/[0.1] hover:border-white/[0.2] bg-white/[0.01]'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    handleFileChange(e.dataTransfer.files[0] ?? null)
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                  {resumeFile ? (
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-[#C5A059]/10 text-[#C5A059] flex items-center justify-center shrink-0">
                        <FileText className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-200 truncate">{resumeFile.name}</p>
                        <p className="text-[11px] text-stone-400">{(resumeFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        className="size-7 rounded-full flex items-center justify-center text-stone-400 hover:text-rose-400 transition-colors"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="size-9 rounded-full bg-white/[0.04] flex items-center justify-center text-stone-400">
                        <Paperclip className="size-4" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-stone-200">Drop your resume here or <span className="text-[#C5A059] underline">browse</span></p>
                        <p className="text-[11px] text-stone-400 mt-0.5">PDF, DOC, DOCX — max 10 MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className={cn(
                  'w-full gap-2 club-gold-gradient hover:brightness-105 text-[#142318] font-bold text-xs rounded-full h-11 border-0 shadow-sm transition-transform active:scale-98',
                  submitting && 'opacity-80'
                )}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="size-4 border-2 border-[#142318]/40 border-t-[#142318] rounded-full animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    Submit Application
                  </>
                )}
              </Button>

              <p className="text-[11px] text-center text-stone-400">
                Your credentials are kept strictly private in accordance with tournament club protocols.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
