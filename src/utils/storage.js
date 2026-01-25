// Storage utility functions for localStorage
// All data is automatically saved to browser localStorage for persistence across sessions
// Data is stored locally in the browser and persists between page refreshes and browser restarts

const STORAGE_KEYS = {
  CHILDREN: 'olam-katan-children',
  AGE_GROUPS: 'olam-katan-age-groups'
}

export const getChildren = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHILDREN)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading children:', error)
    return []
  }
}

export const saveChildren = (children) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(children))
  } catch (error) {
    console.error('Error saving children:', error)
  }
}

export const getAgeGroups = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AGE_GROUPS)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading age groups:', error)
    return []
  }
}

export const saveAgeGroups = (ageGroups) => {
  try {
    localStorage.setItem(STORAGE_KEYS.AGE_GROUPS, JSON.stringify(ageGroups))
  } catch (error) {
    console.error('Error saving age groups:', error)
  }
}
