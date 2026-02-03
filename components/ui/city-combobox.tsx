'use client'

import { useEffect, useMemo } from 'react'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import {
  useColombiaLocationsStore,
  City,
} from '@/lib/store/colombia-locations-store'

interface CityComboBoxProps {
  value?: string | null
  onChange?: (value: string | null, selectedCity?: City) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  stateId?: number | null // Optional stateId to force loading cities for specific state
}

export function CityComboBox({
  value = null,
  onChange,
  placeholder = 'Seleccionar ciudad...',
  disabled = false,
  className = 'w-full',
  stateId,
}: CityComboBoxProps) {
  const {
    cities,
    isLoadingCities,
    loadCities,
    selectedCity,
    selectedState,
    setSelectedCity,
  } = useColombiaLocationsStore()

  const currentSelectedState = stateId
    ? ({ id_state: stateId } as any)
    : selectedState

  useEffect(() => {
    // Load cities when state is selected
    if (currentSelectedState?.id_state) {
      loadCities(currentSelectedState.id_state).catch(console.error)
    } else {
      // Clear cities when no state is selected
      setSelectedCity(null)
    }
  }, [currentSelectedState?.id_state, loadCities, setSelectedCity])

  const options: ComboboxOption[] = useMemo(
    () =>
      cities.map((city) => ({
        value: city.city_name, // Usar nombre para el formulario
        label: city.city_name,
        id: city.id_city, // Mantener ID para validaciones
      })),
    [cities]
  )

  const handleCityChange = (optionValue: string | null) => {
    if (optionValue) {
      const city = cities.find((c) => c.city_name === optionValue)
      setSelectedCity(city || null)
      onChange?.(optionValue, city || undefined)
    } else {
      setSelectedCity(null)
      onChange?.(null, undefined)
    }
  }

  // Sync external value with internal state
  useEffect(() => {
    if (value && (!selectedCity || selectedCity.city_name !== value)) {
      const city = cities.find((c) => c.city_name === value)
      setSelectedCity(city || null)
    } else if (!value && selectedCity) {
      setSelectedCity(null)
    }
  }, [value, selectedCity, cities, setSelectedCity])

  // Disable city selection when no state is selected
  const isDisabled =
    disabled || !currentSelectedState?.id_state || isLoadingCities

  return (
    <Combobox
      options={options}
      value={selectedCity?.city_name || value}
      onChange={handleCityChange}
      placeholder={
        isDisabled ? 'Seleccione primero un departamento' : placeholder
      }
      disabled={isDisabled}
      isLoading={isLoadingCities}
      className={className}
    />
  )
}
