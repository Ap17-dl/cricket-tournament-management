import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
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
      // 1. Upload resume to Supabase Storage
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
          Thank you for your interest in joining LocalCricket. We'll review your application and get back to you soon.
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
    <div className="space-y-8 pb-8">
      {/* Back navigation */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Home
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-xs font-semibold flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            Actively Hiring
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Join Our Team</h1>
        <p className="text-muted-foreground mt-2 max-w-lg">
          We're building the future of local cricket management. Come be a part of it.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Job Listing — Left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job card */}
          <Card className="border-primary/20 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-emerald-500" />
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Briefcase className="size-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Frontend Developer</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Clock className="size-3" />
                      Full-time
                    </Badge>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <MapPin className="size-3" />
                      Remote
                    </Badge>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                We're looking for a talented Frontend Developer to help build and scale our cricket tournament platform. You'll work with React, TypeScript, and Supabase to deliver exceptional user experiences.
              </p>
            </CardContent>
          </Card>

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
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-2 mb-6">
                <Send className="size-5 text-primary" />
                <h2 className="text-lg font-bold">Apply Now</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name & Email row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      placeholder="John Doe"
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Phone & Experience row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience_years">
                      Years of Experience <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="experience_years"
                      name="experience_years"
                      type="number"
                      min="0"
                      max="50"
                      placeholder="2"
                      value={formData.experience_years}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Portfolio */}
                <div className="space-y-2">
                  <Label htmlFor="portfolio_url">Portfolio / GitHub URL</Label>
                  <Input
                    id="portfolio_url"
                    name="portfolio_url"
                    type="url"
                    placeholder="https://github.com/johndoe"
                    value={formData.portfolio_url}
                    onChange={handleChange}
                  />
                </div>

                {/* Cover Letter */}
                <div className="space-y-2">
                  <Label htmlFor="cover_letter">
                    Cover Letter <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="cover_letter"
                    name="cover_letter"
                    placeholder="Tell us why you'd be a great fit for this role, your relevant experience, and what excites you about LocalCricket..."
                    rows={6}
                    className="resize-none"
                    value={formData.cover_letter}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 50 characters. Share your passion and experience.
                  </p>
                </div>

                {/* Resume Upload */}
                <div className="space-y-2">
                  <Label>
                    Resume <span className="text-destructive">*</span>
                  </Label>
                  <div
                    className={cn(
                      'relative border-2 border-dashed rounded-lg p-5 transition-colors cursor-pointer',
                      dragOver
                        ? 'border-primary bg-primary/5'
                        : resumeFile
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
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
                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="size-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{resumeFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                          className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <div className="size-10 rounded-full bg-accent flex items-center justify-center">
                          <Paperclip className="size-5 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">Drop your resume here or <span className="text-primary underline">browse</span></p>
                          <p className="text-xs text-muted-foreground mt-0.5">PDF, DOC, DOCX — max 10 MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Submit */}
                <Button
                  type="submit"
                  size="lg"
                  className={cn(
                    'w-full gap-2 font-semibold text-base',
                    submitting && 'opacity-80'
                  )}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Submit Application
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By submitting, you agree to our processing of your information for recruitment purposes.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
