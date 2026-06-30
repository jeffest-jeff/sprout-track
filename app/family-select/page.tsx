'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Icon } from '@/src/components/ui/icon';
import { mdiMagnify, mdiChevronDown, mdiAccountGroup, mdiArrowRight } from '@mdi/js';
import { useTheme } from '@/src/context/theme';
import { FamilyResponse } from '@/app/api/types';import { useLocalization } from '@/src/context/localization';

import './family-select.css';

export default function FamilySelectPage() {
  const { t } = useLocalization();

  const router = useRouter();
  const { theme } = useTheme();
  const [families, setFamilies] = useState<FamilyResponse[]>([]);
  const [filteredFamilies, setFilteredFamilies] = useState<FamilyResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedFamily, setSelectedFamily] = useState<FamilyResponse | null>(null);
  const [deploymentMode, setDeploymentMode] = useState<string>('selfhosted');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check deployment mode and redirect if SaaS
  useEffect(() => {
    const checkDeploymentMode = async () => {
      try {
        const response = await fetch('/api/deployment-config');
        const data = await response.json();
        
        if (data.success && data.data?.deploymentMode === 'saas') {
          // In SaaS mode, family-select page should not be accessible
          router.push('/');
          return;
        }
        
        setDeploymentMode(data.data?.deploymentMode || 'selfhosted');
      } catch (error) {
        console.error('Error checking deployment mode:', error);
        // Default to selfhosted if we can't determine the mode
        setDeploymentMode('selfhosted');
      }
    };
    
    checkDeploymentMode();
  }, [router]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load families
  useEffect(() => {
    const loadFamilies = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/family/public-list');
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setFamilies(data.data);
            setFilteredFamilies(data.data);
          }
        }
      } catch (error) {
        console.error('Error loading families:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFamilies();
  }, []);

  // Filter families based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredFamilies(dropdownOpen ? families : []);
    } else {
      const filtered = families.filter(family => 
        family.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        family.slug.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFamilies(filtered);
      // Don't automatically open dropdown here - let user interactions control it
    }
    setHighlightedIndex(-1);
  }, [searchTerm, families, dropdownOpen]);

  // Check if already authenticated on page load
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    const unlockTime = localStorage.getItem('unlockTime');
    
    if (authToken && unlockTime) {
      try {
        const payload = authToken.split('.')[1];
        const decodedPayload = JSON.parse(atob(payload));
        
        if (decodedPayload.exp && decodedPayload.exp * 1000 > Date.now()) {
          if (decodedPayload.familySlug) {
            router.push(`/${decodedPayload.familySlug}/log-entry`);
            return;
          }
        }
      } catch (error) {
        console.error('Error parsing JWT token:', error);
      }
    }
  }, [router]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (selectedFamily) {
      setSelectedFamily(null);
    }
    // Open dropdown when user actively types
    if (value.trim() !== '') {
      setDropdownOpen(true);
    }
    setHighlightedIndex(-1);
  };

  const handleSearchFocus = () => {
    setDropdownOpen(true);
  };

  const handleFamilySelect = (family: FamilyResponse) => {
    setSelectedFamily(family);
    setSearchTerm('');
    setDropdownOpen(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleProceed = () => {
    if (selectedFamily) {
      router.push(`/${selectedFamily.slug}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setDropdownOpen(true);
        e.preventDefault();
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredFamilies.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredFamilies.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredFamilies.length) {
          handleFamilySelect(filteredFamilies[highlightedIndex]);
        } else if (filteredFamilies.length === 1) {
          handleFamilySelect(filteredFamilies[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setDropdownOpen(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white family-select-container">
        <div className="text-center">
          <div className="w-24 h-24 p-1 flex items-center justify-center mb-4">
            <Image
              src="/sprout-128.png"
              alt="Sprout Logo"
              width={128}
              height={128}
              className="object-contain"
              priority
            />
          </div>
          <p className="text-gray-500 family-select-loading-text">{t('Loading families...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white family-select-container">
      <div className="w-full max-w-md mx-auto p-6">
        <div className="text-center mt-2 mb-4">
          <h2 className="text-xl font-semibold family-select-title">{t('Welcome to Sprout Track')}</h2>
          <p className="text-sm text-gray-500 family-select-description">
            {t('Choose your family to continue to login')}
          </p>
        </div>
        
        <div className="flex flex-col items-center space-y-6 pb-6 pl-6 pr-6">
          <div className="w-24 h-24 p-1 flex items-center justify-center">
            <Image
              src="/sprout-128.png"
              alt="Sprout Logo"
              width={128}
              height={128}
              className="object-contain"
              priority
            />
          </div>
          
          <div className="w-full max-w-[320px] space-y-6">
            {/* Family Search Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-teal-600 mb-4">
                <Icon path={mdiAccountGroup} size="1.25rem" className="family-select-section-icon" />
                <span className="text-lg font-semibold family-select-section-title">{t('Family Selection')}</span>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <div className="relative w-full">
                  <div className="flex items-center w-full">
                    <div className="absolute left-3 z-10">
                      <Icon path={mdiMagnify} size="1rem" className="text-gray-500 family-select-search-icon" />
                    </div>
                    <Input
                      ref={inputRef}
                      value={searchTerm}
                      onChange={handleSearchChange}
                      onFocus={handleSearchFocus}
                      onKeyDown={handleKeyDown}
                      className="w-full pl-10 pr-10 family-select-input"
                      placeholder="Search for your family..."
                      disabled={loading}
                    />
                    <span
                      className="absolute right-3 text-gray-500 family-select-dropdown-icon cursor-pointer"
                      onClick={() => {
                        const willOpen = !dropdownOpen;
                        setDropdownOpen(willOpen);
                        if (willOpen && inputRef.current) {
                          setTimeout(() => inputRef.current?.focus(), 0);
                        } else if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                      }}
                    >
                      <Icon path={mdiChevronDown} size="1rem" />
                    </span>
                  </div>
                  
                  {dropdownOpen && filteredFamilies.length > 0 && (
                    <div 
                      ref={dropdownRef}
                      className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto family-select-dropdown"
                      style={{ width: inputRef.current?.offsetWidth }}
                    >
                      {filteredFamilies.length > 0 ? (
                        <div className="py-1">
                          {filteredFamilies.map((family, index) => (
                            <div 
                              key={family.id}
                              className={`px-4 py-3 cursor-pointer family-select-dropdown-item ${
                                highlightedIndex === index 
                                  ? 'bg-teal-50 family-select-dropdown-item-highlighted' 
                                  : 'hover:bg-gray-50'
                              }`}
                              onClick={() => handleFamilySelect(family)}
                              onMouseEnter={() => setHighlightedIndex(index)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 family-select-dropdown-family-name">
                                    {family.name}
                                  </div>
                                  <div className="text-sm text-gray-500 family-select-dropdown-family-slug">
                                    /{family.slug}
                                  </div>
                                </div>
                                <Icon path={mdiAccountGroup} size="1rem" className="text-gray-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 family-select-no-families">
                          {searchTerm.trim() !== '' ? 'No families found' : 'No families available'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Selected Family Display */}
            {selectedFamily && (
              <div className="bg-teal-50 rounded-lg p-4 border border-teal-200 family-select-selected-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center family-select-selected-icon-container">
                      <Icon path={mdiAccountGroup} size="1rem" className="text-teal-600 family-select-selected-icon" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 family-select-selected-family-name">
                        {selectedFamily.name}
                      </div>
                      <div className="text-sm text-gray-500 family-select-selected-family-slug">
                        /{selectedFamily.slug}
                      </div>
                    </div>
                  </div>
                  <div className="text-teal-600 family-select-selected-label">
                    {t('Selected')}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="w-full max-w-[320px]">
            <Button
              onClick={handleProceed}
              disabled={!selectedFamily}
              className="w-full h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center space-x-2">
                <span>{t('Continue to Login')}</span>
                <Icon path={mdiArrowRight} size="1rem" />
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
