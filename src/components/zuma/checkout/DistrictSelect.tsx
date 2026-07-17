import { ChevronDown } from "lucide-react";

export const DistrictSelect = ({
  label,
  v,
  set,
  districts,
  err,
  placeholder,
  className = "",
}: {
  label: string;
  v: number | null;
  set: (id: number | null, name: string) => void;
  districts: {
    district_id: number;
    name: string;
  }[];
  err?: string;
  placeholder?: string;
  className?: string;
}) => {

  const selected =
    districts.find(
      (d) => d.district_id === v
    )?.name ?? "";


  return (
    <div className={`flex flex-col gap-1.5 relative ${className}`}>

      <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
        {label}
      </span>

      <div className="relative">

        <select
          value={v ?? ""}
          onChange={(e) => {

            const district =
              districts.find(
                d =>
                  d.district_id === Number(e.target.value)
              );

            if (district) {

  console.log("DISTRICT SELECTED:", district);

  set(
    district.district_id,
    district.name
  );
} else {
              set(null, "");
            }

          }}

         className="
  w-full
  appearance-none
  bg-background
  border
  border-border
  px-3
  py-2
  text-[10px]
  text-foreground
  focus:border-primary
  outline-none
  transition-colors
  pr-8
"
        >

          <option value="">
            {placeholder ?? "Select district"}
          </option>


          {districts.map((d) => (

            <option
              key={d.district_id}
              value={d.district_id}
            >
              {d.name}
            </option>

          ))}

        </select>


        <ChevronDown
          className="
            w-3
            h-3
            text-muted-foreground
            absolute
            right-3
            top-1/2
            -translate-y-1/2
            pointer-events-none
          "
        />

      </div>


      {err && (
        <span className="text-[9px] text-destructive">
          {err}
        </span>
      )}

    </div>
  );
};
