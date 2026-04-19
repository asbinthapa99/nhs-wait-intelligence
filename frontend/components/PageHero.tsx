interface PageHeroProps {
  eyebrow?: string
  title: string
  description: string
  aside?: React.ReactNode
  actions?: React.ReactNode
}

export default function PageHero({ eyebrow, title, description, aside, actions }: PageHeroProps) {
  return (
    <section className="mb-10 bg-white border-b-8 border-[#005eb8] pb-10">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_1fr] lg:items-start">
        <div className="flex flex-col">
          {eyebrow ? (
            <p className="text-xl font-bold text-gray-600 mb-2">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-6 leading-tight">
            {title}
          </h1>
          <p className="max-w-3xl text-xl md:text-2xl leading-normal text-gray-800 mb-8">
            {description}
          </p>
          {actions ? (
            <div className="flex flex-wrap gap-4">
              {actions}
            </div>
          ) : null}
        </div>

        {aside ? (
          <div className="border-t-4 border-[#005eb8] bg-[#f3f2f1] p-6 mt-8 lg:mt-0">
            <h2 className="text-2xl font-bold text-black mb-4">Related content</h2>
            <div className="relative z-10">{aside}</div>
          </div>
        ) : null}
      </div>
    </section>
  )
}