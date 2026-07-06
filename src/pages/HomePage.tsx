import { motion } from 'framer-motion'
import {
  BarChart3,
  HeartPulse,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import FAQItem from '../components/FAQItem'
import FeatureCard from '../components/FeatureCard'
import Footer from '../components/Footer'
import HowItWorksCard from '../components/HowItWorksCard'
import Navbar from '../components/Navbar'
import SectionHeading from '../components/SectionHeading'
import TestimonialCard from '../components/TestimonialCard'
import LandingLayout from '../layouts/LandingLayout'
import type { Feature, Step } from '../types'

const features: Feature[] = [
  {
    icon: '🥗',
    title: 'Personalized Meal Plans',
    description: 'AI-powered weekly plans that adapt to your goals, preferences, and schedule.',
  },
  {
    icon: '🔍',
    title: 'AI Food Analysis',
    description: 'Instant nutrient insights for ingredients, meals, and everyday choices.',
  },
  {
    icon: '🛒',
    title: 'Smart Shopping Lists',
    description: 'Organized grocery guidance that matches your meals and saves time.',
  },
]

const steps: Step[] = [
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: 'Start with your goals',
    description: 'Tell OptiMeal your nutrition preferences, dietary needs, and activity plan.',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Track every meal',
    description: 'Smart food scanning and calorie tracking help you stay on target with ease.',
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: 'See beautiful progress',
    description: 'Actionable insights and gentle recommendations keep your habits moving forward.',
  },
]

const testimonials = [
  {
    quote:
      'OptiMeal feels like a personal nutritionist in my pocket. The meal planning suggestions are always practical and motivating.',
    name: 'Mia Jordan',
    title: 'Wellness Coach',
    avatar: 'MJ',
  },
  {
    quote:
      'I love how the app breaks down my grocery list and shows me nutrient impact. It makes healthy eating feel effortless.',
    name: 'Leo Barnes',
    title: 'Fitness Enthusiast',
    avatar: 'LB',
  },
  {
    quote:
      'The design and experience are so polished. This is the kind of tool I would recommend to every client.',
    name: 'Olivia Grant',
    title: 'Dietitian',
    avatar: 'OG',
  },
]

const faqs = [
  {
    question: 'Is OptiMeal suitable for all diets?',
    answer:
      'Yes. OptiMeal is designed to support vegan, vegetarian, gluten-free, keto, and balanced meal plans with flexible customization.',
  },
  {
    question: 'Can I sync my eating habits across devices?',
    answer:
      'Your OptiMeal experience is built to sync across platforms soon. For now, enjoy a responsive web experience optimized for desktop and mobile.',
  },
  {
    question: 'How soon can I see results?',
    answer:
      'Most users feel more confident about their nutrition in the first week, thanks to simplified tracking and smarter meal recommendations.',
  },
]

function HomePage() {
  return (
    <LandingLayout>
      <div className="relative mx-auto max-w-7xl px-6 py-6 sm:px-8">
        <Navbar />

        <main className="space-y-24 pb-16 pt-10 lg:pb-24 lg:pt-12">
          <section className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_0.95fr] lg:items-center lg:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="space-y-8"
            >
              <div className="inline-flex rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.35em] text-emerald-700 ring-1 ring-emerald-200">
                Premium nutrition intelligence
              </div>
              <div className="space-y-6">
                <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
                  Eat Smarter. Live Better.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                  Your AI nutrition coach creates personalized meal plans, tracks calories, analyzes your food,
                  and helps you reach your goals.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <a
                  id="get-started"
                  href="#features"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-700"
                >
                  Get Started
                </a>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-4 text-sm font-semibold text-slate-950 transition duration-300 hover:border-emerald-200 hover:text-emerald-700"
                >
                  <PlayCircle className="h-5 w-5" />
                  Watch Demo
                </a>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm shadow-slate-900/5">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Avg. Score</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">92%</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm shadow-slate-900/5">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Meals planned</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">1.2k+</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm shadow-slate-900/5">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Success rate</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">94%</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              className="relative overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/90 p-8 shadow-[0_40px_120px_-50px_rgba(15,23,42,0.3)]"
            >
              <div className="absolute -left-12 top-12 h-40 w-40 rounded-full bg-emerald-200/70 blur-3xl" />
              <div className="absolute -right-8 bottom-16 h-32 w-32 rounded-full bg-slate-100 blur-3xl" />
              <div className="relative space-y-6">
                <div className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-2xl shadow-slate-950/10">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-emerald-200/80">Weekly summary</p>
                      <p className="mt-2 text-3xl font-semibold">Optimize your nutrition</p>
                    </div>
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 text-emerald-300">
                      <HeartPulse className="h-7 w-7" />
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-white/10 p-4 backdrop-blur-sm">
                      <p className="text-sm text-slate-200">Calories</p>
                      <p className="mt-3 text-2xl font-semibold">1,680</p>
                    </div>
                    <div className="rounded-3xl bg-white/10 p-4 backdrop-blur-sm">
                      <p className="text-sm text-slate-200">Protein</p>
                      <p className="mt-3 text-2xl font-semibold">72g</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.75rem] bg-white p-5 shadow-sm shadow-slate-900/5">
                    <p className="text-sm font-semibold text-slate-950">Daily nutrition</p>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>Carbs</span>
                        <strong className="text-slate-950">128g</strong>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full w-4/5 rounded-full bg-emerald-600" />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[1.75rem] bg-white p-5 shadow-sm shadow-slate-900/5">
                    <p className="text-sm font-semibold text-slate-950">Hydration</p>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>Water</span>
                        <strong className="text-slate-950">8 cups</strong>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full w-3/4 rounded-full bg-emerald-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          <section id="features" className="space-y-8">
            <SectionHeading
              eyebrow="Features"
              title="Everything you need for smarter nutrition."
              description="OptiMeal combines planning, tracking, and personalized insights into one beautifully designed experience."
            />
            <div className="grid gap-6 lg:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </section>

          <section id="how-it-works" className="space-y-8">
            <SectionHeading
              eyebrow="How It Works"
              title="A seamless workflow for your healthiest routine."
              description="From goal setting to grocery planning, OptiMeal makes each step clear, simple, and supportive."
            />
            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <HowItWorksCard key={step.title} {...step} />
              ))}
            </div>
          </section>

          <section id="testimonials" className="space-y-8">
            <SectionHeading
              eyebrow="Testimonials"
              title="Trusted by nutrition experts and everyday users."
              description="These early users love the clarity OptiMeal brings to their meal planning and food tracking."
            />
            <div className="grid gap-6 xl:grid-cols-3">
              {testimonials.map((testimonial) => (
                <TestimonialCard
                  key={testimonial.name}
                  quote={testimonial.quote}
                  name={testimonial.name}
                  title={testimonial.title}
                  avatar={testimonial.avatar}
                />
              ))}
            </div>
          </section>

          <section id="pricing" className="space-y-8">
            <SectionHeading
              eyebrow="Pricing"
              title="Coming soon."
              description="A polished subscription experience is on the way, tailored for individuals and teams who want premium nutrition support."
            />
            <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-xl shadow-slate-900/5">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
                    Launching soon
                  </p>
                  <p className="mt-4 text-3xl font-semibold text-slate-950">Premium plans for every goal</p>
                </div>
                <a
                  href="#footer"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-700"
                >
                  Join the waitlist
                </a>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-emerald-50 p-5 text-slate-950">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Launch offer</p>
                  <p className="mt-3 text-3xl font-semibold">Early access</p>
                </div>
                <div className="rounded-3xl bg-white p-5 text-slate-700">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Team-ready</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">Workspace support</p>
                </div>
                <div className="rounded-3xl bg-white p-5 text-slate-700">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Goals aligned</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">Personalized coaching</p>
                </div>
              </div>
            </div>
          </section>

          <section id="faq" className="space-y-8">
            <SectionHeading
              eyebrow="FAQ"
              title="Your top questions, answered."
              description="A quick overview of how OptiMeal works and what you can expect from the upcoming launch."
            />
            <div className="grid gap-4 lg:grid-cols-3">
              {faqs.map((faq) => (
                <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </LandingLayout>
  )
}

export default HomePage
