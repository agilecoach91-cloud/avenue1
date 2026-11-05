import { Icon, PICKER_ICONS } from "@/components/Icon";

/** Radio grid of tile icons for services and add-ons. */
export function IconPicker({ value, legend = "Icon on the booking tile" }: { value: string | null | undefined; legend?: string }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
        {PICKER_ICONS.map((i) => (
          <label key={i.id} className="cursor-pointer" title={i.label}>
            <input type="radio" name="icon" value={i.id} defaultChecked={value === i.id} className="peer sr-only" />
            <span className="grid aspect-square place-items-center rounded-md border-[1.5px] border-line text-steel peer-checked:border-ink peer-checked:bg-surface peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-ink hover:border-ink">
              <Icon name={i.id} size={22} />
            </span>
            <span className="sr-only">{i.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
