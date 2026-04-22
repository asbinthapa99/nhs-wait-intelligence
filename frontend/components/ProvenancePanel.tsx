interface ProvenancePanelItem {
  label: string
  value: string
  tone?: 'default' | 'info' | 'warn'
}

interface ProvenancePanelProps {
  title?: string
  items: ProvenancePanelItem[]
  footnote?: string
}

function getToneClasses(tone: ProvenancePanelItem['tone'] = 'default') {
  if (tone === 'info') {
    return {
      badge: 'border-emerald-200 bg-emerald-50 text-blue-700',
      value: 'text-[#222]',
    }
  }

  if (tone === 'warn') {
    return {
      badge: 'border-amber-200 bg-amber-50 text-amber-700',
      value: 'text-[#222]',
    }
  }

  return {
    badge: 'border-[#e5e5e5] bg-[#f9fafb] text-[#666]',
    value: 'text-[#222]',
  }
}

export default function ProvenancePanel({
  title = 'Data provenance and transparency',
  items,
  footnote,
}: ProvenancePanelProps) {
  return (
    <section className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#111]">{title}</h2>
          <p className="mt-1 text-sm text-[#888]">A concise summary of source coverage, freshness, and caveats.</p>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-nhs-blue">Provenance</div>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const toneClasses = getToneClasses(item.tone)

          return (
            <div
              key={`${item.label}-${item.value}`}
              className="flex flex-col gap-2 rounded-2xl border border-[#e5e5e5] bg-[#f9fafb]/70 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses.badge}`}>
                {item.label}
              </span>
              <p className={`text-sm font-medium leading-6 ${toneClasses.value} sm:max-w-[70%] sm:text-right`}>
                {item.value}
              </p>
            </div>
          )
        })}
      </div>

      {footnote ? <p className="mt-4 text-xs leading-5 text-[#888]">{footnote}</p> : null}
    </section>
  )
}