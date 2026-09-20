# Frozen 8e4ad79 reference

`rankCalculator.ts` is the baseline calculator, with only its type import relocated.
`rankData.ts` preserves the baseline exhaustive recurrence (including Infinity for
unreachable ranks). Neither file is imported by the application or generator.
All 45,000 valid start/strategy combinations must retain identical path objects.
