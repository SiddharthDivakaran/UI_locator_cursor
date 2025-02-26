let selectedElement = null;
let locatorPanel = null;
let savedLocators = {};
let isTestingLocator = false;
let errorMessageDiv = null;
let adBanner = null;
let adCounter = 0;

// Listen for right-click and context menu selection
document.addEventListener('contextmenu', (e) => {
  selectedElement = e.target;
});

// Function to get all possible locators for an element
function getLocators(element) {
  const locators = {
    css: '',
    xpath: '',
    className: '',
    linkText: '',
    partialLinkText: '',
    tagName: ''
  };

  // CSS
  locators.css = generateCSSSelector(element);

  // XPath
  locators.xpath = generateXPath(element);

  // Class
  if (element.className) {
    locators.className = element.className.trim();
  }

  // Link text and partial link text (only for anchor tags)
  if (element.tagName.toLowerCase() === 'a') {
    const text = element.textContent.trim();
    if (text) {
      locators.linkText = text;
      locators.partialLinkText = text;
    }
  }

  // Tag name
  locators.tagName = element.tagName.toLowerCase();

  return locators;
}

// Improved CSS selector generator
function generateCSSSelector(element) {
  // If element has ID, use it (most reliable)
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Try with class if it's not too generic
  if (element.classList && element.classList.length > 0) {
    const classList = Array.from(element.classList)
      .filter(cls => 
        // Filter out common dynamic/state classes
        !cls.match(/^(active|selected|hover|open|show|hide|hidden|visible|collapsed|expanded)$/) &&
        // Filter out utility classes (often numeric or very short)
        cls.length > 3
      );
    
    if (classList.length > 0) {
      // Try with the most specific class first
      const mostSpecificClass = classList.sort((a, b) => b.length - a.length)[0];
      const tagWithClass = `${element.tagName.toLowerCase()}.${mostSpecificClass}`;
      
      // Check if this selector uniquely identifies the element
      try {
        const elements = document.querySelectorAll(tagWithClass);
        if (elements.length === 1) {
          return tagWithClass;
        }
      } catch (e) {
        // If there's an error with the selector, continue to other methods
        console.error('Error with class selector:', e);
      }
    }
  }
  
  // Try with specific attributes based on element type
  if (element.tagName === 'A' && element.href) {
    // For links, try href
    const href = element.getAttribute('href');
    if (href) {
      try {
        const tagWithHref = `a[href="${href}"]`;
        const elements = document.querySelectorAll(tagWithHref);
        if (elements.length === 1) {
          return tagWithHref;
        }
      } catch (e) {
        console.error('Error with href selector:', e);
      }
    }
  }
  
  if (element.tagName === 'IMG' && element.alt) {
    // For images, try alt text
    const alt = element.getAttribute('alt');
    if (alt) {
      try {
        const tagWithAlt = `img[alt="${alt}"]`;
        const elements = document.querySelectorAll(tagWithAlt);
        if (elements.length === 1) {
          return tagWithAlt;
        }
      } catch (e) {
        console.error('Error with alt selector:', e);
      }
    }
  }
  
  if (element.tagName === 'INPUT') {
    // For inputs, try name and type
    const name = element.getAttribute('name');
    const type = element.getAttribute('type');
    
    if (name) {
      try {
        const tagWithName = `input[name="${name}"]`;
        const elements = document.querySelectorAll(tagWithName);
        if (elements.length === 1) {
          return tagWithName;
        }
      } catch (e) {
        console.error('Error with name selector:', e);
      }
    }
    
    if (type) {
      try {
        const tagWithType = `input[type="${type}"]`;
        const elements = document.querySelectorAll(tagWithType);
        if (elements.length === 1) {
          return tagWithType;
        }
      } catch (e) {
        console.error('Error with type selector:', e);
      }
    }
  }
  
  // Default CSS selector generation using path
  let path = [];
  let currentElement = element;
  
  while (currentElement) {
    let selector = currentElement.tagName.toLowerCase();
    
    if (currentElement.id) {
      selector += `#${currentElement.id}`;
      path.unshift(selector);
      break;
    }
    
    // Add nth-of-type for more specificity
    let sibling = currentElement;
    let nth = 1;
    
    while (sibling.previousElementSibling) {
      sibling = sibling.previousElementSibling;
      if (sibling.tagName === currentElement.tagName) nth++;
    }
    
    if (nth > 1) selector += `:nth-of-type(${nth})`;
    path.unshift(selector);
    
    // Stop at body to avoid overly complex selectors
    if (currentElement.tagName.toLowerCase() === 'body') break;
    
    currentElement = currentElement.parentElement;
  }
  
  return path.join(' > ');
}

// Function to generate XPath
function generateXPath(element) {
  // If element has ID, use it (most reliable)
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  // Generate XPath by traversing up the DOM tree
  let path = [];
  let currentElement = element;
  
  while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
    let currentPath = currentElement.tagName.toLowerCase();
    
    // Add index if there are siblings of the same type
    const siblings = Array.from(currentElement.parentNode.children).filter(
      child => child.tagName === currentElement.tagName
    );
    
    if (siblings.length > 1) {
      const index = siblings.indexOf(currentElement) + 1;
      currentPath += `[${index}]`;
    }
    
    path.unshift(currentPath);
    
    // Stop at body to avoid overly complex XPaths
    if (currentElement.tagName.toLowerCase() === 'body') break;
    
    currentElement = currentElement.parentElement;
  }
  
  return `//${path.join('/')}`;
}

// Function to create highlight overlay
function createHighlightOverlay(element) {
  try {
    // Get element position accounting for scrolling
    const rect = element.getBoundingClientRect();
    
    // Create overlay element - use a simple red border only
    const overlay = document.createElement('div');
    
    // Position overlay directly over the element
    overlay.style.cssText = `
      position: absolute;
      top: ${window.scrollY + rect.top}px;
      left: ${window.scrollX + rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid red;
      pointer-events: none;
      z-index: 2147483645;
      transition: all 0.2s ease;
    `;
    
    overlay.id = 'element-locator-overlay';
    document.body.appendChild(overlay);
    
    return { overlay };
  } catch (error) {
    console.error('Error creating highlight overlay:', error);
    return null;
  }
}

// Function to show error message in the panel
function showErrorMessage(message) {
  // Remove any existing error message
  clearErrorMessage();
  
  // Create error message div
  errorMessageDiv = document.createElement('div');
  errorMessageDiv.id = 'element-locator-error';
  errorMessageDiv.style.cssText = `
    background-color: rgba(255, 130, 130, 0.6);
    color: white;
    padding: 10px;
    margin: 10px 0;
    border-radius: 4px;
    font-size: 14px;
    word-wrap: break-word;
    overflow-y: auto;
    max-height: 80px;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 100, 100, 0.3);
    box-shadow: 0 2px 6px rgba(255, 0, 0, 0.1);
  `;
  errorMessageDiv.textContent = message;
  
  // Insert before the button container
  if (locatorPanel) {
    const actionContainer = locatorPanel.querySelector('div[style*="display: flex; gap: 12px"]');
    if (actionContainer) {
      locatorPanel.insertBefore(errorMessageDiv, actionContainer);
    } else {
      locatorPanel.appendChild(errorMessageDiv);
    }
  }
}

// Function to clear error message
function clearErrorMessage() {
  if (errorMessageDiv && errorMessageDiv.parentNode) {
    errorMessageDiv.parentNode.removeChild(errorMessageDiv);
    errorMessageDiv = null;
  }
}

// Function to simulate hover on an element
async function simulateHover(element) {
  try {
    const mouseoverEvent = new MouseEvent('mouseover', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(mouseoverEvent);
    
    // Wait a bit for any hover effects to take place
    await new Promise(resolve => setTimeout(resolve, 300));
  } catch (error) {
    console.error('Error simulating hover:', error);
  }
}

// Function to try to open menus if the element is in a dropdown
async function openMenus(element) {
  try {
    // Check if element is visible
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      // Try to find parent menus/dropdowns
      let parent = element.parentElement;
      const menuParents = [];
      
      while (parent && parent !== document.body) {
        // Check if this parent looks like a menu container
        if (
          parent.classList.contains('menu') ||
          parent.classList.contains('dropdown') ||
          parent.classList.contains('submenu') ||
          parent.getAttribute('role') === 'menu' ||
          parent.getAttribute('aria-haspopup') === 'true'
        ) {
          menuParents.unshift(parent); // Add to beginning of array
        }
        parent = parent.parentElement;
      }
      
      // Try to open each menu parent by hovering
      for (const menuParent of menuParents) {
        await simulateHover(menuParent);
      }
    }
  } catch (error) {
    console.error('Error opening menus:', error);
  }
}

// Function to show the locator panel
function showLocatorPanel(locators) {
  // Remove existing panel if any
  if (locatorPanel && locatorPanel.parentNode) {
    locatorPanel.parentNode.removeChild(locatorPanel);
  }
  
  // Create panel
  locatorPanel = document.createElement('div');
  locatorPanel.style.cssText = `
    position: fixed;
    width: 400px;
    max-height: 90vh;
    background: rgba(34, 34, 34, 0.85);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 2147483647;
    overflow-y: auto;
    font-family: Arial, sans-serif;
    padding: 16px;
    box-sizing: border-box;
    color: white;
  `;
  
  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 8px;
  `;
  
  const titleContainer = document.createElement('div');
  titleContainer.style.cssText = `
    display: flex;
    align-items: center;
    font-weight: bold;
    font-size: 18px;
    color: white;
  `;
  
  // Add 3D cube SVG icon
  const iconSvg = document.createElement('div');
  iconSvg.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#009688" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  `;
  iconSvg.style.cssText = `
    margin-right: 8px;
    display: flex;
    align-items: center;
  `;
  
  const title = document.createElement('span');
  title.textContent = 'Element Locator';
  
  titleContainer.appendChild(iconSvg);
  titleContainer.appendChild(title);
  
  // Create right-side button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  // Add page object button
  const pageObjectButton = document.createElement('button');
  pageObjectButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  `;
  pageObjectButton.title = "Generate Page Objects";
  pageObjectButton.style.cssText = `
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border-radius: 4px;
  `;
  pageObjectButton.addEventListener('mouseover', () => {
    pageObjectButton.style.color = '#9C27B0'; // Purple color on hover
  });
  pageObjectButton.addEventListener('mouseout', () => {
    pageObjectButton.style.color = '#999';
  });
  pageObjectButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    showLibraryManager(); // Show library manager where page object buttons are available
  });
  
  // Add library manager button
  const libraryButton = document.createElement('button');
  libraryButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
    </svg>
  `;
  libraryButton.title = "Open Library Manager";
  libraryButton.style.cssText = `
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border-radius: 4px;
  `;
  libraryButton.addEventListener('mouseover', () => {
    libraryButton.style.color = '#33a095';
  });
  libraryButton.addEventListener('mouseout', () => {
    libraryButton.style.color = '#999';
  });
  libraryButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    showLibraryManager();
  });
  
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
  `;
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    locatorPanel.parentNode.removeChild(locatorPanel);
    locatorPanel = null;
  });
  
  buttonContainer.appendChild(pageObjectButton);
  buttonContainer.appendChild(libraryButton);
  buttonContainer.appendChild(closeButton);
  
  header.appendChild(titleContainer);
  header.appendChild(buttonContainer);
  locatorPanel.appendChild(header);
  
  // Element name input
  const nameContainer = document.createElement('div');
  nameContainer.style.cssText = `
    margin-bottom: 16px;
  `;
  
  const nameLabel = document.createElement('div');
  nameLabel.style.cssText = `
    margin-bottom: 8px;
    text-transform: uppercase;
    font-size: 14px;
    color: #ccc;
  `;
  nameLabel.textContent = 'ELEMENT NAME';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = `element_${Math.floor(Math.random() * 1000)}`;
  nameInput.style.cssText = `
    width: 100%;
    padding: 12px;
    background-color: rgba(26, 26, 26, 0.6);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
  `;
  
  nameContainer.appendChild(nameLabel);
  nameContainer.appendChild(nameInput);
  locatorPanel.appendChild(nameContainer);
  
  // Create locator type section
  const locatorTypeContainer = document.createElement('div');
  locatorTypeContainer.style.cssText = `
    margin-bottom: 16px;
  `;
  
  const locatorTypeLabel = document.createElement('div');
  locatorTypeLabel.style.cssText = `
    margin-bottom: 8px;
    text-transform: uppercase;
    font-size: 14px;
    color: #ccc;
  `;
  locatorTypeLabel.textContent = 'LOCATOR TYPE';
  
  const locatorTypeButtons = document.createElement('div');
  locatorTypeButtons.style.cssText = `
    display: flex;
    gap: 8px;
  `;
  
  // Create locator type buttons
  const strategies = [
    { id: 'css', label: 'CSS', isDefault: true },
    { id: 'xpath', label: 'XPATH', isDefault: false },
    { id: 'classname', label: 'CLASS', isDefault: false },
    { id: 'linktext', label: 'LINK', isDefault: false }
  ];
  
  strategies.forEach(strategy => {
    const button = document.createElement('button');
    button.textContent = strategy.label;
    button.dataset.strategy = strategy.id;
    button.style.cssText = `
      flex: 1;
      padding: 12px;
      background-color: ${strategy.isDefault ? 'rgba(0, 150, 136, 0.7)' : 'rgba(26, 26, 26, 0.6)'};
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      text-align: center;
      transition: background-color 0.2s ease;
    `;
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Update button styles
      locatorTypeButtons.querySelectorAll('button').forEach(btn => {
        btn.style.backgroundColor = 'rgba(26, 26, 26, 0.6)';
      });
      button.style.backgroundColor = 'rgba(0, 150, 136, 0.7)';
      
      // Update textarea value based on selected strategy
      const strategyId = button.dataset.strategy;
      const locatorValue = locators[strategyId] || '';
      locatorValueTextarea.value = locatorValue;
      
      // Clear any error messages
      clearErrorMessage();
    });
    
    locatorTypeButtons.appendChild(button);
  });
  
  locatorTypeContainer.appendChild(locatorTypeLabel);
  locatorTypeContainer.appendChild(locatorTypeButtons);
  locatorPanel.appendChild(locatorTypeContainer);
  
  // Create locator value section
  const locatorValueContainer = document.createElement('div');
  locatorValueContainer.style.cssText = `
    margin-bottom: 16px;
  `;
  
  const locatorValueLabel = document.createElement('div');
  locatorValueLabel.style.cssText = `
    margin-bottom: 8px;
    text-transform: uppercase;
    font-size: 14px;
    color: #ccc;
  `;
  locatorValueLabel.textContent = 'LOCATOR VALUE';
  
  const locatorValueTextarea = document.createElement('textarea');
  locatorValueTextarea.value = locators.css; // Default to CSS
  locatorValueTextarea.style.cssText = `
    width: 100%;
    padding: 12px;
    background-color: rgba(26, 26, 26, 0.6);
    color: white;
    border: none;
    border-radius: 4px;
    font-family: monospace;
    font-size: 14px;
    resize: vertical;
    min-height: 80px;
    box-sizing: border-box;
  `;
  
  locatorValueContainer.appendChild(locatorValueLabel);
  locatorValueContainer.appendChild(locatorValueTextarea);
  locatorPanel.appendChild(locatorValueContainer);
  
  // Create button container for side-by-side buttons
  const actionButtonContainer = document.createElement('div');
  actionButtonContainer.style.cssText = `
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  `;
  
  // Create buttons
  const testButton = document.createElement('button');
  testButton.textContent = 'Test Locator';
  testButton.style.cssText = `
    flex: 1;
    padding: 16px;
    background-color: rgba(0, 150, 136, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    text-align: center;
    transition: background-color 0.2s ease;
  `;
  testButton.addEventListener('mouseover', () => {
    testButton.style.backgroundColor = 'rgba(0, 150, 136, 0.9)';
  });
  testButton.addEventListener('mouseout', () => {
    testButton.style.backgroundColor = 'rgba(0, 150, 136, 0.7)';
  });
  testButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isTestingLocator) return;
    isTestingLocator = true;
    
    // Get selected strategy
    const selectedButton = locatorTypeButtons.querySelector('button[style*="background-color: rgba(0, 150, 136"]');
    if (!selectedButton) {
      showErrorMessage('Please select a locator strategy');
      isTestingLocator = false;
      return;
    }
    
    const strategy = selectedButton.dataset.strategy;
    const locator = locatorValueTextarea.value.trim();
    
    if (!locator) {
      showErrorMessage('Locator value is empty');
      isTestingLocator = false;
      return;
    }
    
    await testLocator(strategy, locator);
  });
  
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save Locator';
  saveButton.style.cssText = `
    flex: 1;
    padding: 16px;
    background-color: rgba(33, 150, 243, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    text-align: center;
    transition: background-color 0.2s ease;
  `;
  saveButton.addEventListener('mouseover', () => {
    saveButton.style.backgroundColor = 'rgba(33, 150, 243, 0.9)';
  });
  saveButton.addEventListener('mouseout', () => {
    saveButton.style.backgroundColor = 'rgba(33, 150, 243, 0.7)';
  });
  saveButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    const elementName = nameInput.value.trim();
    if (!elementName) {
      showErrorMessage('Please enter an element name');
      return;
    }
    
    // Get selected strategy
    const selectedButton = locatorTypeButtons.querySelector('button[style*="background-color: rgba(0, 150, 136"]');
    if (!selectedButton) {
      showErrorMessage('Please select a locator strategy');
      return;
    }
    
    const strategy = selectedButton.dataset.strategy;
    const locator = locatorValueTextarea.value.trim();
    
    if (!locator) {
      showErrorMessage('Locator value is empty');
      return;
    }
    
    // Create locators object with all strategies
    const locatorsToSave = {
      css: strategy === 'css' ? locator : locators.css || '',
      xpath: strategy === 'xpath' ? locator : locators.xpath || '',
      className: strategy === 'classname' ? locator : locators.className || '',
      linkText: strategy === 'linktext' ? locator : locators.linkText || ''
    };
    
    saveLocatorsToFile(elementName, locatorsToSave);
  });
  
  // Add Code Snippets button
  const codeSnippetsButton = document.createElement('button');
  codeSnippetsButton.textContent = 'Code Snippets';
  codeSnippetsButton.style.cssText = `
    flex: 1;
    padding: 16px;
    background-color: rgba(156, 39, 176, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    text-align: center;
    transition: background-color 0.2s ease;
  `;
  codeSnippetsButton.addEventListener('mouseover', () => {
    codeSnippetsButton.style.backgroundColor = 'rgba(156, 39, 176, 0.9)';
  });
  codeSnippetsButton.addEventListener('mouseout', () => {
    codeSnippetsButton.style.backgroundColor = 'rgba(156, 39, 176, 0.7)';
  });
  codeSnippetsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    const elementName = nameInput.value.trim();
    if (!elementName) {
      showErrorMessage('Please enter an element name');
      return;
    }
    
    // Get selected strategy
    const selectedButton = locatorTypeButtons.querySelector('button[style*="background-color: rgba(0, 150, 136"]');
    if (!selectedButton) {
      showErrorMessage('Please select a locator strategy');
      return;
    }
    
    const strategy = selectedButton.dataset.strategy;
    const locator = locatorValueTextarea.value.trim();
    
    if (!locator) {
      showErrorMessage('Locator value is empty');
      return;
    }
    
    showCodeSnippetsModal(elementName, strategy, locator);
  });
  
  actionButtonContainer.appendChild(testButton);
  actionButtonContainer.appendChild(saveButton);
  actionButtonContainer.appendChild(codeSnippetsButton);
  locatorPanel.appendChild(actionButtonContainer);
  
  // Add ad banner
  createAdBanner();
  
  // Position the panel based on element position
  positionPanel();
  
  // Add to document
  document.body.appendChild(locatorPanel);
  
  // Increment ad counter for next ad refresh
  adCounter++;
}

// Function to create ad banner
function createAdBanner() {
  adBanner = document.createElement('div');
  adBanner.className = 'element-locator-ad-banner';
  adBanner.style.cssText = `
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  const sponsoredLabel = document.createElement('span');
  sponsoredLabel.textContent = 'Sponsored';
  sponsoredLabel.style.cssText = `
    color: #999;
    font-size: 10px;
  `;
  
  const adLabel = document.createElement('span');
  adLabel.textContent = 'Ad';
  adLabel.style.cssText = `
    color: #999;
    font-size: 10px;
  `;
  
  adBanner.appendChild(sponsoredLabel);
  adBanner.appendChild(adLabel);
  
  const adContent = document.createElement('div');
  adContent.style.cssText = `
    width: 100%;
    height: 60px;
    background-color: rgba(34, 34, 34, 0.3);
    margin-top: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    font-size: 12px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  `;
  adContent.textContent = 'Google Ad Space';
  adContent.addEventListener('mouseover', () => {
    adContent.style.backgroundColor = 'rgba(34, 34, 34, 0.5)';
  });
  adContent.addEventListener('mouseout', () => {
    adContent.style.backgroundColor = 'rgba(34, 34, 34, 0.3)';
  });
  
  const adContainer = document.createElement('div');
  adContainer.style.cssText = `
    width: 100%;
  `;
  adContainer.appendChild(adBanner);
  adContainer.appendChild(adContent);
  
  locatorPanel.appendChild(adContainer);
}

// Function to position panel based on element position
function positionPanel() {
  if (!locatorPanel || !selectedElement) return;
  
  const rect = selectedElement.getBoundingClientRect();
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const panelWidth = 400; // Width of our panel
  const panelHeight = Math.min(windowHeight * 0.9, 600); // Max height of panel
  
  // Determine horizontal position
  let left;
  if (rect.left > windowWidth / 2) {
    // Element is on the right side, place panel on the left
    left = Math.max(10, rect.left - panelWidth - 20);
  } else {
    // Element is on the left side, place panel on the right
    left = Math.min(windowWidth - panelWidth - 10, rect.right + 20);
  }
  
  // Determine vertical position
  let top;
  if (rect.top > windowHeight / 2) {
    // Element is in the bottom half, place panel higher
    top = Math.max(10, rect.top - panelHeight / 2);
  } else {
    // Element is in the top half, place panel lower
    top = Math.min(windowHeight - panelHeight - 10, rect.bottom);
  }
  
  // Ensure panel is fully visible
  if (top + panelHeight > windowHeight) {
    top = windowHeight - panelHeight - 10;
  }
  
  locatorPanel.style.left = `${left}px`;
  locatorPanel.style.top = `${top}px`;
}

// Function to test locator and highlight element
async function testLocator(strategy, locator) {
  try {
    // Clear any existing error message
    clearErrorMessage();
    
    // Remove any existing overlay
    const existingOverlay = document.getElementById('element-locator-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    let element;
    
    // Find the element based on the strategy
    switch (strategy) {
      case 'css':
        try {
          element = document.querySelector(locator);
        } catch (e) {
          console.error('Invalid CSS selector:', e);
          showErrorMessage(`Invalid CSS selector: ${e.message}`);
          isTestingLocator = false;
          return;
        }
        break;
      case 'xpath':
        try {
          element = document.evaluate(locator, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        } catch (e) {
          console.error('Invalid XPath:', e);
          showErrorMessage(`Invalid XPath: ${e.message}`);
          isTestingLocator = false;
          return;
        }
        break;
      case 'classname':
        element = document.getElementsByClassName(locator)[0];
        break;
      case 'linktext':
        element = Array.from(document.getElementsByTagName('a'))
          .find(a => a.textContent.trim() === locator);
        break;
      case 'partiallinktext':
        element = Array.from(document.getElementsByTagName('a'))
          .find(a => a.textContent.trim().includes(locator));
        break;
      case 'tagname':
        element = document.getElementsByTagName(locator)[0];
        break;
    }

    if (element) {
      console.log('Found element:', element);
      
      // Try to open menus if the element might be in a dropdown
      await openMenus(element);
      
      // Create a simplified overlay (just border)
      const highlightElements = createHighlightOverlay(element);
      
      // Scroll element into view with smooth scrolling
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Update position of overlay as needed
      const updateInterval = setInterval(() => {
        if (highlightElements && highlightElements.overlay && highlightElements.overlay.parentNode) {
          const newRect = element.getBoundingClientRect();
          highlightElements.overlay.style.top = `${window.scrollY + newRect.top}px`;
          highlightElements.overlay.style.left = `${window.scrollX + newRect.left}px`;
          highlightElements.overlay.style.width = `${newRect.width}px`;
          highlightElements.overlay.style.height = `${newRect.height}px`;
        } else {
          clearInterval(updateInterval);
        }
      }, 200);
      
      // Remove overlay after delay
      setTimeout(() => {
        clearInterval(updateInterval);
        if (highlightElements && highlightElements.overlay && highlightElements.overlay.parentNode) {
          highlightElements.overlay.parentNode.removeChild(highlightElements.overlay);
        }
        isTestingLocator = false;
      }, 3000);
    } else {
      console.error('Element not found with', strategy, locator);
      showErrorMessage(`Element not found with ${strategy}: ${locator}`);
      isTestingLocator = false;
    }
  } catch (error) {
    console.error('Error in testLocator:', error);
    showErrorMessage(`Error: ${error.message}`);
    isTestingLocator = false;
  }
}

async function saveLocatorsToFile(elementName, locators) {
  // Create file save dialog
  showFileSaveDialog(elementName, locators);
}

// Function to show file save dialog
function showFileSaveDialog(elementName, locators) {
  // Create sanitized filename from page title
  const defaultFileName = sanitizeFileName(document.title);
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2147483648;
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: rgba(34, 34, 34, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    padding: 20px;
    width: 400px;
    color: white;
    font-family: Arial, sans-serif;
  `;

  // Create modal header
  const modalHeader = document.createElement('div');
  modalHeader.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 8px;
  `;

  const modalTitle = document.createElement('h3');
  modalTitle.textContent = 'Save Locator';
  modalTitle.style.cssText = `
    margin: 0;
    font-size: 18px;
  `;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
  `;
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });

  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);
  modalContent.appendChild(modalHeader);

  // File name input
  const fileNameContainer = document.createElement('div');
  fileNameContainer.style.cssText = `
    margin-bottom: 16px;
  `;

  const fileNameLabel = document.createElement('div');
  fileNameLabel.style.cssText = `
    margin-bottom: 8px;
    font-size: 14px;
    color: #ccc;
  `;
  fileNameLabel.textContent = 'File Name:';

  const fileNameInput = document.createElement('input');
  fileNameInput.type = 'text';
  fileNameInput.value = defaultFileName;
  fileNameInput.style.cssText = `
    width: 100%;
    padding: 12px;
    background-color: rgba(26, 26, 26, 0.6);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
  `;

  fileNameContainer.appendChild(fileNameLabel);
  fileNameContainer.appendChild(fileNameInput);
  modalContent.appendChild(fileNameContainer);

  // Storage type selection
  const storageTypeContainer = document.createElement('div');
  storageTypeContainer.style.cssText = `
    margin-bottom: 16px;
  `;

  const storageTypeLabel = document.createElement('div');
  storageTypeLabel.style.cssText = `
    margin-bottom: 8px;
    font-size: 14px;
    color: #ccc;
  `;
  storageTypeLabel.textContent = 'Storage Type:';

  const storageTypeOptions = document.createElement('div');
  storageTypeOptions.style.cssText = `
    display: flex;
    gap: 10px;
  `;

  // Library Option (default)
  const libraryContainer = document.createElement('div');
  libraryContainer.style.cssText = `
    display: flex;
    align-items: center;
  `;

  const libraryRadio = document.createElement('input');
  libraryRadio.type = 'radio';
  libraryRadio.name = 'storageType';
  libraryRadio.id = 'storageLibrary';
  libraryRadio.value = 'library';
  libraryRadio.checked = true;
  libraryRadio.style.cssText = `
    margin-right: 5px;
  `;

  const libraryLabel = document.createElement('label');
  libraryLabel.htmlFor = 'storageLibrary';
  libraryLabel.textContent = 'Save to Library';
  libraryLabel.style.cssText = `
    font-size: 14px;
    color: white;
  `;

  libraryContainer.appendChild(libraryRadio);
  libraryContainer.appendChild(libraryLabel);

  // Download Option
  const downloadContainer = document.createElement('div');
  downloadContainer.style.cssText = `
    display: flex;
    align-items: center;
  `;

  const downloadRadio = document.createElement('input');
  downloadRadio.type = 'radio';
  downloadRadio.name = 'storageType';
  downloadRadio.id = 'storageDownload';
  downloadRadio.value = 'download';
  downloadRadio.style.cssText = `
    margin-right: 5px;
  `;

  const downloadLabel = document.createElement('label');
  downloadLabel.htmlFor = 'storageDownload';
  downloadLabel.textContent = 'Download File';
  downloadLabel.style.cssText = `
    font-size: 14px;
    color: white;
  `;

  downloadContainer.appendChild(downloadRadio);
  downloadContainer.appendChild(downloadLabel);

  storageTypeOptions.appendChild(libraryContainer);
  storageTypeOptions.appendChild(downloadContainer);

  storageTypeContainer.appendChild(storageTypeLabel);
  storageTypeContainer.appendChild(storageTypeOptions);
  modalContent.appendChild(storageTypeContainer);

  // File format selection (only visible when download is selected)
  const fileFormatContainer = document.createElement('div');
  fileFormatContainer.style.cssText = `
    margin-bottom: 20px;
    display: none;
  `;

  const fileFormatLabel = document.createElement('div');
  fileFormatLabel.style.cssText = `
    margin-bottom: 8px;
    font-size: 14px;
    color: #ccc;
  `;
  fileFormatLabel.textContent = 'File Format:';

  const fileFormatOptions = document.createElement('div');
  fileFormatOptions.style.cssText = `
    display: flex;
    gap: 10px;
  `;

  // JSON Option
  const jsonContainer = document.createElement('div');
  jsonContainer.style.cssText = `
    display: flex;
    align-items: center;
  `;

  const jsonRadio = document.createElement('input');
  jsonRadio.type = 'radio';
  jsonRadio.name = 'fileFormat';
  jsonRadio.id = 'formatJson';
  jsonRadio.value = 'json';
  jsonRadio.checked = true;
  jsonRadio.style.cssText = `
    margin-right: 5px;
  `;

  const jsonLabel = document.createElement('label');
  jsonLabel.htmlFor = 'formatJson';
  jsonLabel.textContent = 'JSON';
  jsonLabel.style.cssText = `
    font-size: 14px;
    color: white;
  `;

  jsonContainer.appendChild(jsonRadio);
  jsonContainer.appendChild(jsonLabel);

  // CSV Option
  const csvContainer = document.createElement('div');
  csvContainer.style.cssText = `
    display: flex;
    align-items: center;
  `;

  const csvRadio = document.createElement('input');
  csvRadio.type = 'radio';
  csvRadio.name = 'fileFormat';
  csvRadio.id = 'formatCsv';
  csvRadio.value = 'csv';
  csvRadio.style.cssText = `
    margin-right: 5px;
  `;

  const csvLabel = document.createElement('label');
  csvLabel.htmlFor = 'formatCsv';
  csvLabel.textContent = 'CSV';
  csvLabel.style.cssText = `
    font-size: 14px;
    color: white;
  `;

  csvContainer.appendChild(csvRadio);
  csvContainer.appendChild(csvLabel);

  fileFormatOptions.appendChild(jsonContainer);
  fileFormatOptions.appendChild(csvContainer);

  fileFormatContainer.appendChild(fileFormatLabel);
  fileFormatContainer.appendChild(fileFormatOptions);
  modalContent.appendChild(fileFormatContainer);

  // Show/hide format options based on storage type selection
  libraryRadio.addEventListener('change', () => {
    if (libraryRadio.checked) {
      fileFormatContainer.style.display = 'none';
    }
  });

  downloadRadio.addEventListener('change', () => {
    if (downloadRadio.checked) {
      fileFormatContainer.style.display = 'block';
    }
  });

  // Message area (for errors or info)
  const messageArea = document.createElement('div');
  messageArea.style.cssText = `
    display: none;
    padding: 10px;
    margin-bottom: 16px;
    border-radius: 4px;
    font-size: 14px;
    background-color: rgba(255, 130, 130, 0.6);
    color: white;
  `;
  modalContent.appendChild(messageArea);

  // Action buttons
  const actionButtonsContainer = document.createElement('div');
  actionButtonsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
  `;

  // Primary action buttons
  const primaryButtons = document.createElement('div');
  primaryButtons.style.cssText = `
    display: flex;
    gap: 10px;
  `;

  // Save button
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.style.cssText = `
    flex: 1;
    padding: 12px;
    background-color: rgba(0, 150, 136, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
  `;
  saveButton.addEventListener('mouseover', () => {
    saveButton.style.backgroundColor = 'rgba(0, 150, 136, 0.9)';
  });
  saveButton.addEventListener('mouseout', () => {
    saveButton.style.backgroundColor = 'rgba(0, 150, 136, 0.7)';
  });
  saveButton.addEventListener('click', async () => {
    const fileName = fileNameInput.value.trim();
    if (!fileName) {
      showMessage('Please enter a file name', 'error');
      return;
    }

    const storageType = document.querySelector('input[name="storageType"]:checked').value;
    const format = document.querySelector('input[name="fileFormat"]:checked').value;
    
    try {
      if (storageType === 'library') {
        // Save to library (localStorage)
        saveLocatorToLibrary(fileName, elementName, locators);
        showMessage('Locator saved to library successfully!', 'success');
      } else {
        // Download file
        await downloadLocatorFile(fileName, format, elementName, locators);
        showMessage('Locator file downloaded successfully!', 'success');
      }
      
      // Don't close the modal immediately to show the success message
      setTimeout(() => {
        document.body.removeChild(modalOverlay);
      }, 1500);
    } catch (error) {
      showMessage(`Error saving locator: ${error.message}`, 'error');
    }
  });

  // Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = `
    flex: 1;
    padding: 12px;
    background-color: rgba(120, 120, 120, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
  `;
  cancelButton.addEventListener('mouseover', () => {
    cancelButton.style.backgroundColor = 'rgba(120, 120, 120, 0.9)';
  });
  cancelButton.addEventListener('mouseout', () => {
    cancelButton.style.backgroundColor = 'rgba(120, 120, 120, 0.7)';
  });
  cancelButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });

  primaryButtons.appendChild(saveButton);
  primaryButtons.appendChild(cancelButton);
  actionButtonsContainer.appendChild(primaryButtons);

  // Library Manager button
  const manageLibraryButton = document.createElement('button');
  manageLibraryButton.textContent = 'Open Library Manager';
  manageLibraryButton.style.cssText = `
    width: 100%;
    padding: 10px;
    background-color: rgba(33, 150, 243, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
  `;
  manageLibraryButton.addEventListener('mouseover', () => {
    manageLibraryButton.style.backgroundColor = 'rgba(33, 150, 243, 0.9)';
  });
  manageLibraryButton.addEventListener('mouseout', () => {
    manageLibraryButton.style.backgroundColor = 'rgba(33, 150, 243, 0.7)';
  });
  manageLibraryButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
    showLibraryManager();
  });

  actionButtonsContainer.appendChild(manageLibraryButton);
  modalContent.appendChild(actionButtonsContainer);

  // Helper function to show messages in the modal
  function showMessage(text, type = 'info') {
    messageArea.textContent = text;
    messageArea.style.display = 'block';
    
    if (type === 'error') {
      messageArea.style.backgroundColor = 'rgba(255, 130, 130, 0.6)';
    } else if (type === 'success') {
      messageArea.style.backgroundColor = 'rgba(76, 175, 80, 0.6)';
    } else {
      messageArea.style.backgroundColor = 'rgba(33, 150, 243, 0.6)';
    }
  }

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}

// Function to save locator to library (localStorage)
function saveLocatorToLibrary(fileName, elementName, locators) {
  // Initialize library if not exists
  if (!localStorage.getItem('element_locator_library')) {
    localStorage.setItem('element_locator_library', JSON.stringify({
      collections: {}
    }));
  }
  
  const library = JSON.parse(localStorage.getItem('element_locator_library'));
  
  // Add or update collection
  if (!library.collections[fileName]) {
    library.collections[fileName] = {
      name: fileName,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      pages: {}
    };
  } else {
    library.collections[fileName].lastModified = new Date().toISOString();
  }
  
  // Get or create page entry
  const pageUrl = window.location.href;
  if (!library.collections[fileName].pages[pageUrl]) {
    library.collections[fileName].pages[pageUrl] = {
      url: pageUrl,
      title: document.title,
      elements: {}
    };
  }
  
  // Add element locators
  library.collections[fileName].pages[pageUrl].elements[elementName] = locators;
  
  // Save back to localStorage
  localStorage.setItem('element_locator_library', JSON.stringify(library));
}

// Function to download locator file
async function downloadLocatorFile(fileName, format, elementName, locators) {
  const pageData = {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    elements: {
      [elementName]: locators
    }
  };

  if (format === 'json') {
    // Create JSON file
    const jsonData = {
      [window.location.href]: pageData
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    downloadFileWithConfirmation(blob, `${fileName}.json`);
  } else {
    // Create CSV file
    let csvContent = 'Element Name,URL,Page Title,Timestamp,Locator Type,Locator Value\n';
    
    // Add rows for each locator type
    Object.entries(locators).forEach(([type, value]) => {
      if (value) {
        const row = [
          elementName,
          window.location.href,
          document.title,
          new Date().toISOString(),
          type,
          `"${value.replace(/"/g, '""')}"`
        ].join(',');
        
        csvContent += row + '\n';
      }
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadFileWithConfirmation(blob, `${fileName}.csv`);
  }
}

// Function to show library manager
function showLibraryManager() {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2147483648;
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: rgba(34, 34, 34, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    padding: 20px;
    width: 80%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    color: white;
    font-family: Arial, sans-serif;
  `;

  // Create modal header
  const modalHeader = document.createElement('div');
  modalHeader.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 8px;
  `;

  const modalTitle = document.createElement('h3');
  modalTitle.textContent = 'Locator Library Manager';
  modalTitle.style.cssText = `
    margin: 0;
    font-size: 20px;
  `;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
  `;
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });

  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);
  modalContent.appendChild(modalHeader);

  // Get library data
  const libraryData = JSON.parse(localStorage.getItem('element_locator_library') || '{"collections":{}}');
  const collections = libraryData.collections;

  // Empty state
  if (Object.keys(collections).length === 0) {
    const emptyState = document.createElement('div');
    emptyState.style.cssText = `
      padding: 40px;
      text-align: center;
      color: #aaa;
    `;
    emptyState.innerHTML = `
      <div style="font-size: 60px; margin-bottom: 20px;">📂</div>
      <div style="font-size: 18px; margin-bottom: 10px;">Your locator library is empty</div>
      <div style="font-size: 14px;">Save some locators to see them here</div>
    `;
    modalContent.appendChild(emptyState);
  } else {
    // Collections container
    const collectionsContainer = document.createElement('div');
    collectionsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 20px;
    `;

    // Create collection cards
    Object.values(collections).forEach(collection => {
      const collectionCard = document.createElement('div');
      collectionCard.style.cssText = `
        background: rgba(26, 26, 26, 0.5);
        border-radius: 6px;
        padding: 15px;
      `;

      // Collection header
      const collectionHeader = document.createElement('div');
      collectionHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 8px;
      `;

      const collectionName = document.createElement('div');
      collectionName.textContent = collection.name;
      collectionName.style.cssText = `
        font-size: 18px;
        font-weight: bold;
      `;

      // Collection actions
      const collectionActions = document.createElement('div');
      collectionActions.style.cssText = `
        display: flex;
        gap: 8px;
      `;

      // Generate POM button
      const generatePomButton = document.createElement('button');
      generatePomButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      `;
      generatePomButton.title = "Generate Page Objects";
      generatePomButton.style.cssText = `
        background-color: rgba(156, 39, 176, 0.7);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
      `;
      generatePomButton.addEventListener('mouseover', () => {
        generatePomButton.style.backgroundColor = 'rgba(156, 39, 176, 0.9)';
      });
      generatePomButton.addEventListener('mouseout', () => {
        generatePomButton.style.backgroundColor = 'rgba(156, 39, 176, 0.7)';
      });
      generatePomButton.addEventListener('click', () => {
        showPageObjectModelModal(collection);
      });

      // Export button
      const exportButton = document.createElement('button');
      exportButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      `;
      exportButton.title = "Export Collection";
      exportButton.style.cssText = `
        background-color: rgba(0, 150, 136, 0.7);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
      `;
      exportButton.addEventListener('mouseover', () => {
        exportButton.style.backgroundColor = 'rgba(0, 150, 136, 0.9)';
      });
      exportButton.addEventListener('mouseout', () => {
        exportButton.style.backgroundColor = 'rgba(0, 150, 136, 0.7)';
      });
      exportButton.addEventListener('click', () => {
        exportCollection(collection);
      });

      // Delete button
      const deleteButton = document.createElement('button');
      deleteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;
      deleteButton.title = "Delete Collection";
      deleteButton.style.cssText = `
        background-color: rgba(244, 67, 54, 0.7);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
      `;
      deleteButton.addEventListener('mouseover', () => {
        deleteButton.style.backgroundColor = 'rgba(244, 67, 54, 0.9)';
      });
      deleteButton.addEventListener('mouseout', () => {
        deleteButton.style.backgroundColor = 'rgba(244, 67, 54, 0.7)';
      });
      deleteButton.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete "${collection.name}"?`)) {
          deleteCollection(collection.name);
          document.body.removeChild(modalOverlay);
          showLibraryManager(); // Refresh
        }
      });

      collectionActions.appendChild(generatePomButton);
      collectionActions.appendChild(exportButton);
      collectionActions.appendChild(deleteButton);

      collectionHeader.appendChild(collectionName);
      collectionHeader.appendChild(collectionActions);
      collectionCard.appendChild(collectionHeader);

      // Collection details
      const collectionDetails = document.createElement('div');
      collectionDetails.style.cssText = `
        font-size: 12px;
        color: #aaa;
        margin-bottom: 12px;
      `;
      
      const pageCount = Object.keys(collection.pages).length;
      let elementCount = 0;
      Object.values(collection.pages).forEach(page => {
        elementCount += Object.keys(page.elements).length;
      });
      
      const lastModified = new Date(collection.lastModified).toLocaleString();
      
      collectionDetails.textContent = `${pageCount} pages, ${elementCount} elements • Last modified: ${lastModified}`;
      collectionCard.appendChild(collectionDetails);

      // Pages preview
      const pagesPreview = document.createElement('div');
      pagesPreview.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 150px;
        overflow-y: auto;
        font-size: 13px;
      `;

      Object.values(collection.pages).forEach(page => {
        const pageItem = document.createElement('div');
        pageItem.style.cssText = `
          display: flex;
          justify-content: space-between;
          padding: 6px 10px;
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          word-break: break-all;
        `;

        const pageTitle = document.createElement('div');
        pageTitle.textContent = page.title || 'Unnamed Page';
        pageTitle.style.cssText = `
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `;

        const elementCount = document.createElement('div');
        elementCount.textContent = `${Object.keys(page.elements).length} elements`;
        elementCount.style.cssText = `
          color: #aaa;
          margin-left: 10px;
        `;

        pageItem.appendChild(pageTitle);
        pageItem.appendChild(elementCount);
        pagesPreview.appendChild(pageItem);
      });

      collectionCard.appendChild(pagesPreview);
      collectionsContainer.appendChild(collectionCard);
    });

    modalContent.appendChild(collectionsContainer);
  }

  // Add export all collections button
  const exportAllContainer = document.createElement('div');
  exportAllContainer.style.cssText = `
    margin: 20px 0 0;
    padding: 15px;
    background-color: rgba(26, 26, 26, 0.5);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `;
  
  const exportAllTitle = document.createElement('div');
  exportAllTitle.textContent = 'Export Options';
  exportAllTitle.style.cssText = `
    font-size: 16px;
    font-weight: bold;
  `;
  
  const exportDescription = document.createElement('div');
  exportDescription.textContent = 'Export collections as individual JSON files or as a single ZIP archive. Files will be saved to your browser\'s default download location.';
  exportDescription.style.cssText = `
    font-size: 13px;
    color: #ccc;
  `;
  
  const exportButtons = document.createElement('div');
  exportButtons.style.cssText = `
    display: flex;
    gap: 10px;
  `;
  
  // Export as ZIP button
  const exportAsZipButton = document.createElement('button');
  exportAsZipButton.textContent = 'Export as ZIP';
  exportAsZipButton.style.cssText = `
    flex: 1;
    padding: 12px;
    background-color: rgba(33, 150, 243, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  `;
  exportAsZipButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
    Export as ZIP
  `;
  exportAsZipButton.addEventListener('mouseover', () => {
    exportAsZipButton.style.backgroundColor = 'rgba(33, 150, 243, 0.9)';
  });
  exportAsZipButton.addEventListener('mouseout', () => {
    exportAsZipButton.style.backgroundColor = 'rgba(33, 150, 243, 0.7)';
  });
  exportAsZipButton.addEventListener('click', () => {
    exportAllCollections('zip');
  });
  
  // Export separate files button
  const exportSeparateButton = document.createElement('button');
  exportSeparateButton.textContent = 'Export Separate Files';
  exportSeparateButton.style.cssText = `
    flex: 1;
    padding: 12px;
    background-color: rgba(0, 150, 136, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  `;
  exportSeparateButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
    Export Separate Files
  `;
  exportSeparateButton.addEventListener('mouseover', () => {
    exportSeparateButton.style.backgroundColor = 'rgba(0, 150, 136, 0.9)';
  });
  exportSeparateButton.addEventListener('mouseout', () => {
    exportSeparateButton.style.backgroundColor = 'rgba(0, 150, 136, 0.7)';
  });
  exportSeparateButton.addEventListener('click', () => {
    exportAllCollections('separate');
  });
  
  exportButtons.appendChild(exportAsZipButton);
  exportButtons.appendChild(exportSeparateButton);
  
  exportAllContainer.appendChild(exportAllTitle);
  exportAllContainer.appendChild(exportDescription);
  exportAllContainer.appendChild(exportButtons);
  
  if (Object.keys(collections).length > 0) {
    modalContent.appendChild(exportAllContainer);
  }

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}

// Function to export a collection
function exportCollection(collection) {
  // Format data for export
  const exportData = {};
  
  // Structure data by page URL
  Object.values(collection.pages).forEach(page => {
    exportData[page.url] = {
      url: page.url,
      title: page.title,
      timestamp: new Date().toISOString(),
      elements: page.elements
    };
  });
  
  // Create file blob
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  downloadFileWithConfirmation(blob, `${collection.name}.json`);
}

// Function to export all collections
function exportAllCollections(mode = 'zip') {
  const libraryData = JSON.parse(localStorage.getItem('element_locator_library') || '{"collections":{}}');
  const collections = libraryData.collections;
  
  if (Object.keys(collections).length === 0) {
    return;
  }
  
  // Create a status message element to show progress
  const statusMessageContainer = document.createElement('div');
  statusMessageContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 150, 136, 0.9);
    color: white;
    padding: 12px 16px;
    border-radius: 4px;
    font-family: Arial, sans-serif;
    max-width: 300px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    z-index: 2147483649;
    transition: opacity 0.3s ease;
  `;
  
  document.body.appendChild(statusMessageContainer);
  statusMessageContainer.textContent = "Preparing collections for export...";
  
  if (mode === 'zip') {
    // Check if JSZip is already loaded
    if (typeof JSZip === 'undefined') {
      // Load JSZip library dynamically
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = createAndDownloadZip;
      script.onerror = () => {
        statusMessageContainer.textContent = "Error loading zip library. Falling back to individual downloads.";
        setTimeout(() => exportCollectionsIndividually(), 1500);
      };
      document.head.appendChild(script);
    } else {
      createAndDownloadZip();
    }
  } else {
    // Export as separate files
    exportCollectionsIndividually();
  }
  
  // Function to create zip and download
  function createAndDownloadZip() {
    try {
      const zip = new JSZip();
      const collectionNames = Object.keys(collections);
      const totalCollections = collectionNames.length;
      
      // Add each collection as a separate file in the zip
      collectionNames.forEach((collectionName, index) => {
        const collection = collections[collectionName];
        
        // Format data for export
        const exportData = {};
        
        // Structure data by page URL
        Object.values(collection.pages).forEach(page => {
          exportData[page.url] = {
            url: page.url,
            title: page.title,
            timestamp: new Date().toISOString(),
            elements: page.elements
          };
        });
        
        // Add file to zip
        zip.file(`${collectionName}.json`, JSON.stringify(exportData, null, 2));
        
        // Update status
        statusMessageContainer.textContent = `Adding collection ${index + 1} of ${totalCollections}: ${collectionName}`;
      });
      
      // Generate the zip file and trigger download
      statusMessageContainer.textContent = "Generating zip file...";
      zip.generateAsync({ type: "blob" }).then(function(content) {
        // Update status message
        statusMessageContainer.textContent = `Preparing zip file with ${totalCollections} collections`;
        
        // Download the zip file with confirmation
        downloadFileWithConfirmation(content, "element_locator_collections.zip");
        
        // Show success message after a brief delay
        setTimeout(() => {
          statusMessageContainer.textContent = `Exported ${totalCollections} collections as a zip file`;
          
          // Remove status message after a delay
          setTimeout(() => {
            if (statusMessageContainer.parentNode) {
              statusMessageContainer.style.opacity = '0';
              setTimeout(() => {
                if (statusMessageContainer.parentNode) {
                  document.body.removeChild(statusMessageContainer);
                }
              }, 300);
            }
          }, 3000);
        }, 500);
      });
    } catch (error) {
      console.error("Error creating zip:", error);
      statusMessageContainer.textContent = "Error creating zip. Falling back to individual downloads.";
      setTimeout(() => exportCollectionsIndividually(), 1500);
    }
  }
  
  // Function to export collections individually
  function exportCollectionsIndividually() {
    const collectionNames = Object.keys(collections);
    const totalCollections = collectionNames.length;
    let currentIndex = 0;
    
    function exportNextCollection() {
      if (currentIndex >= totalCollections) {
        // All collections exported
        statusMessageContainer.textContent = `Exported all ${totalCollections} collections successfully!`;
        
        // Remove status message after a delay
        setTimeout(() => {
          if (statusMessageContainer.parentNode) {
            statusMessageContainer.style.opacity = '0';
            setTimeout(() => {
              if (statusMessageContainer.parentNode) {
                document.body.removeChild(statusMessageContainer);
              }
            }, 300);
          }
        }, 3000);
        
        return;
      }
      
      const collectionName = collectionNames[currentIndex];
      const collection = collections[collectionName];
      
      // Update status message
      statusMessageContainer.textContent = `Exporting collection ${currentIndex + 1} of ${totalCollections}: ${collectionName}`;
      
      // Export the current collection
      exportCollection(collection);
      
      // Move to next collection after a small delay
      currentIndex++;
      setTimeout(exportNextCollection, 800);
    }
    
    // Start the export process
    exportNextCollection();
  }
}

// Function to delete a collection
function deleteCollection(collectionName) {
  const libraryData = JSON.parse(localStorage.getItem('element_locator_library') || '{"collections":{}}');
  
  if (libraryData.collections[collectionName]) {
    delete libraryData.collections[collectionName];
    localStorage.setItem('element_locator_library', JSON.stringify(libraryData));
  }
}

// Function to show download confirmation dialog
function showDownloadConfirmDialog(fileName, downloadAction) {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2147483648;
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: rgba(34, 34, 34, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    padding: 20px;
    width: 450px;
    color: white;
    font-family: Arial, sans-serif;
  `;

  // Create modal header
  const modalHeader = document.createElement('div');
  modalHeader.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 8px;
  `;

  const modalTitle = document.createElement('h3');
  modalTitle.textContent = 'Download Confirmation';
  modalTitle.style.cssText = `
    margin: 0;
    font-size: 18px;
  `;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
  `;
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });

  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);
  modalContent.appendChild(modalHeader);

  // Download info
  const downloadInfoContainer = document.createElement('div');
  downloadInfoContainer.style.cssText = `
    margin-bottom: 16px;
  `;

  const fileNameInfo = document.createElement('div');
  fileNameInfo.style.cssText = `
    margin-bottom: 12px;
    padding: 10px;
    background-color: rgba(0, 150, 136, 0.2);
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  
  const fileIcon = document.createElement('div');
  fileIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#009688" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </svg>
  `;
  
  const fileNameText = document.createElement('div');
  fileNameText.style.cssText = `
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  fileNameText.textContent = fileName;
  
  fileNameInfo.appendChild(fileIcon);
  fileNameInfo.appendChild(fileNameText);
  
  const downloadInfo = document.createElement('div');
  downloadInfo.style.cssText = `
    line-height: 1.5;
    margin-bottom: 15px;
  `;
  downloadInfo.innerHTML = `
    <p style="margin-top: 0;">Your file will be downloaded to your browser's default download location:</p>
    <ul style="margin-bottom: 0; padding-left: 20px;">
      <li>Chrome: ${navigator.userAgent.includes('Mac') ? '~/Downloads' : 'C:\\Users\\[username]\\Downloads'}</li>
      <li>Firefox: ${navigator.userAgent.includes('Mac') ? '~/Downloads' : 'C:\\Users\\[username]\\Downloads'}</li>
      <li>Safari: ${navigator.userAgent.includes('Mac') ? '~/Downloads' : 'Not applicable'}</li>
    </ul>
  `;

  // Browser settings info
  const settingsInfo = document.createElement('div');
  settingsInfo.style.cssText = `
    background-color: rgba(33, 150, 243, 0.2);
    padding: 10px;
    border-radius: 4px;
    font-size: 13px;
    margin-bottom: 15px;
  `;
  settingsInfo.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">Change your default download location:</div>
    <ul style="margin: 0; padding-left: 20px;">
      <li>Chrome: Settings → Advanced → Downloads → Change</li>
      <li>Firefox: Options/Preferences → General → Files and Applications</li>
      <li>Safari: Preferences → General → File download location</li>
    </ul>
  `;

  downloadInfoContainer.appendChild(fileNameInfo);
  downloadInfoContainer.appendChild(downloadInfo);
  downloadInfoContainer.appendChild(settingsInfo);
  modalContent.appendChild(downloadInfoContainer);

  // Checkbox for "Don't show again"
  const checkboxContainer = document.createElement('div');
  checkboxContainer.style.cssText = `
    display: flex;
    align-items: center;
    margin-bottom: 15px;
  `;

  const dontShowCheckbox = document.createElement('input');
  dontShowCheckbox.type = 'checkbox';
  dontShowCheckbox.id = 'dontShowDownloadDialog';
  dontShowCheckbox.style.cssText = `
    margin-right: 8px;
  `;

  const checkboxLabel = document.createElement('label');
  checkboxLabel.htmlFor = 'dontShowDownloadDialog';
  checkboxLabel.textContent = "Don't show this message again";
  checkboxLabel.style.cssText = `
    font-size: 14px;
    color: #ccc;
  `;

  checkboxContainer.appendChild(dontShowCheckbox);
  checkboxContainer.appendChild(checkboxLabel);
  modalContent.appendChild(checkboxContainer);

  // Action buttons
  const actionButtonsContainer = document.createElement('div');
  actionButtonsContainer.style.cssText = `
    display: flex;
    gap: 10px;
  `;

  // Download button
  const downloadButton = document.createElement('button');
  downloadButton.textContent = 'Download';
  downloadButton.style.cssText = `
    flex: 1;
    padding: 12px;
    background-color: rgba(0, 150, 136, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  `;
  downloadButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
    Download
  `;
  downloadButton.addEventListener('mouseover', () => {
    downloadButton.style.backgroundColor = 'rgba(0, 150, 136, 0.9)';
  });
  downloadButton.addEventListener('mouseout', () => {
    downloadButton.style.backgroundColor = 'rgba(0, 150, 136, 0.7)';
  });
  downloadButton.addEventListener('click', () => {
    // Save preference if checkbox is checked
    if (dontShowCheckbox.checked) {
      localStorage.setItem('element_locator_skip_download_dialog', 'true');
    }
    
    // Remove the modal
    document.body.removeChild(modalOverlay);
    
    // Execute the download action
    downloadAction();
  });

  // Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = `
    flex: 1;
    padding: 12px;
    background-color: rgba(120, 120, 120, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
  `;
  cancelButton.addEventListener('mouseover', () => {
    cancelButton.style.backgroundColor = 'rgba(120, 120, 120, 0.9)';
  });
  cancelButton.addEventListener('mouseout', () => {
    cancelButton.style.backgroundColor = 'rgba(120, 120, 120, 0.7)';
  });
  cancelButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });

  actionButtonsContainer.appendChild(downloadButton);
  actionButtonsContainer.appendChild(cancelButton);
  modalContent.appendChild(actionButtonsContainer);

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}

// Helper function to trigger download with confirmation
function downloadFileWithConfirmation(blob, fileName) {
  // Check if user has chosen to skip the dialog
  if (localStorage.getItem('element_locator_skip_download_dialog') === 'true') {
    // Download directly
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
    a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  } else {
    // Show confirmation dialog
    showDownloadConfirmDialog(fileName, () => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

// Helper function to trigger download
function downloadFile(blob, fileName) {
  downloadFileWithConfirmation(blob, fileName);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "findLocators" && selectedElement) {
    const locators = getLocators(selectedElement);
    showLocatorPanel(locators);
  }
});

// Prevent panel from closing during testing
document.addEventListener('click', (e) => {
  if (isTestingLocator && locatorPanel && !locatorPanel.contains(e.target)) {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);

// Prevent keyboard shortcuts from triggering when interacting with our panel
document.addEventListener('keydown', (e) => {
  if (locatorPanel && (locatorPanel.contains(e.target) || isTestingLocator)) {
    e.stopPropagation();
  }
}, true);

// Prevent other events from interfering with our panel
['mousedown', 'mouseup', 'mousemove', 'focus', 'blur'].forEach(eventType => {
  document.addEventListener(eventType, (e) => {
    if (locatorPanel && (locatorPanel.contains(e.target) || isTestingLocator)) {
      e.stopPropagation();
    }
  }, true);
}); 

// Function to sanitize and shorten filename from page title
function sanitizeFileName(pageTitle) {
  // Remove any characters that aren't allowed in filenames
  let fileName = pageTitle.replace(/[\\/:*?"<>|]/g, '_');
  
  // Replace multiple spaces with single underscore
  fileName = fileName.replace(/\s+/g, '_');
  
  // Limit length to 50 characters to keep it manageable
  if (fileName.length > 50) {
    fileName = fileName.substring(0, 47) + '...';
  }
  
  // Remove any leading/trailing underscores
  fileName = fileName.replace(/^_+|_+$/g, '');
  
  // If filename is empty after sanitization, use a default
  if (!fileName) {
    fileName = 'page_locators';
  }
  
  return fileName;
}

// Function to generate code snippets for different testing frameworks
function generateCodeSnippets(strategy, locator, elementName) {
  // Sanitize the element name for use as a variable name
  const safeElementName = elementName.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
  
  // Map strategy to Selenium, Cypress, and Playwright formats
  const seleniumStrategy = {
    'css': 'By.cssSelector',
    'xpath': 'By.xpath',
    'classname': 'By.className',
    'linktext': 'By.linkText',
    'partiallinktext': 'By.partialLinkText',
    'tagname': 'By.tagName'
  }[strategy] || 'By.cssSelector';
  
  const cypressStrategy = {
    'css': '',
    'xpath': 'xpath ',
    'classname': '.', // Cypress uses CSS selectors, so we'll adapt
    'linktext': '', // We'll handle link text specially
    'partiallinktext': '', // We'll handle partial link text specially
    'tagname': '' // Just the tag name for Cypress
  }[strategy] || '';
  
  // Generate Selenium code (Java)
  let seleniumJava = '';
  if (strategy === 'linktext') {
    seleniumJava = `// Selenium Java
WebElement ${safeElementName} = driver.findElement(By.linkText("${locator}"));`;
  } else if (strategy === 'partiallinktext') {
    seleniumJava = `// Selenium Java
WebElement ${safeElementName} = driver.findElement(By.partialLinkText("${locator}"));`;
  } else {
    seleniumJava = `// Selenium Java
WebElement ${safeElementName} = driver.findElement(${seleniumStrategy}("${locator}"));`;
  }
  
  // Generate Selenium code (Python)
  let seleniumPython = '';
  if (strategy === 'linktext') {
    seleniumPython = `# Selenium Python
${safeElementName} = driver.find_element(By.LINK_TEXT, "${locator}")`;
  } else if (strategy === 'partiallinktext') {
    seleniumPython = `# Selenium Python
${safeElementName} = driver.find_element(By.PARTIAL_LINK_TEXT, "${locator}")`;
  } else if (strategy === 'classname') {
    seleniumPython = `# Selenium Python
${safeElementName} = driver.find_element(By.CLASS_NAME, "${locator}")`;
  } else if (strategy === 'css') {
    seleniumPython = `# Selenium Python
${safeElementName} = driver.find_element(By.CSS_SELECTOR, "${locator}")`;
  } else {
    seleniumPython = `# Selenium Python
${safeElementName} = driver.find_element(By.${strategy.toUpperCase()}, "${locator}")`;
  }
  
  // Generate Cypress code
  let cypressCode = '';
  if (strategy === 'linktext') {
    cypressCode = `// Cypress
cy.contains('${locator}')`;
  } else if (strategy === 'partiallinktext') {
    cypressCode = `// Cypress
cy.contains('${locator}')`;
  } else if (strategy === 'classname') {
    cypressCode = `// Cypress
cy.get('.${locator}')`;
  } else if (strategy === 'css') {
    cypressCode = `// Cypress
cy.get('${locator}')`;
  } else if (strategy === 'xpath') {
    cypressCode = `// Cypress
cy.xpath('${locator}')`;
  } else {
    cypressCode = `// Cypress
cy.get('${locator}')`;
  }
  
  // Generate Playwright code
  let playwrightCode = '';
  if (strategy === 'css') {
    playwrightCode = `// Playwright
const ${safeElementName} = await page.locator('${locator}')`;
  } else if (strategy === 'xpath') {
    playwrightCode = `// Playwright
const ${safeElementName} = await page.locator('xpath=${locator}')`;
  } else if (strategy === 'linktext') {
    playwrightCode = `// Playwright
const ${safeElementName} = await page.getByText('${locator}')`;
  } else if (strategy === 'classname') {
    playwrightCode = `// Playwright
const ${safeElementName} = await page.locator('.${locator}')`;
  } else {
    playwrightCode = `// Playwright
const ${safeElementName} = await page.locator('${locator}')`;
  }
  
  return {
    selenium: {
      java: seleniumJava,
      python: seleniumPython
    },
    cypress: cypressCode,
    playwright: playwrightCode
  };
}

// Function to show code snippets modal
function showCodeSnippetsModal(elementName, strategy, locator) {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2147483648;
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: rgba(34, 34, 34, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    padding: 20px;
    width: 80%;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    color: white;
    font-family: Arial, sans-serif;
  `;

  // Create modal header
  const modalHeader = document.createElement('div');
  modalHeader.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 8px;
  `;

  const modalTitle = document.createElement('h3');
  modalTitle.textContent = 'Code Snippets';
  modalTitle.style.cssText = `
    margin: 0;
    font-size: 20px;
  `;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
  `;
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });

  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);
  modalContent.appendChild(modalHeader);

  // Create description
  const description = document.createElement('div');
  description.style.cssText = `
    margin-bottom: 20px;
    color: #ccc;
    line-height: 1.5;
  `;
  description.textContent = `Ready-to-use code snippets for element "${elementName}" using ${strategy.toUpperCase()} locator: ${locator}`;
  modalContent.appendChild(description);

  // Generate code snippets
  const snippets = generateCodeSnippets(strategy, locator, elementName);

  // Create tabs for different frameworks
  const tabsContainer = document.createElement('div');
  tabsContainer.style.cssText = `
    display: flex;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 20px;
  `;

  const tabContent = document.createElement('div');
  tabContent.style.cssText = `
    background-color: rgba(26, 26, 26, 0.6);
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 20px;
    position: relative;
  `;

  const frameworks = [
    { id: 'selenium-java', label: 'Selenium (Java)', content: snippets.selenium.java },
    { id: 'selenium-python', label: 'Selenium (Python)', content: snippets.selenium.python },
    { id: 'cypress', label: 'Cypress', content: snippets.cypress },
    { id: 'playwright', label: 'Playwright', content: snippets.playwright }
  ];

  frameworks.forEach((framework, index) => {
    const tab = document.createElement('div');
    tab.textContent = framework.label;
    tab.dataset.tab = framework.id;
    tab.style.cssText = `
      padding: 10px 15px;
      cursor: pointer;
      color: ${index === 0 ? 'white' : '#999'};
      border-bottom: ${index === 0 ? '2px solid #009688' : 'none'};
      transition: all 0.2s ease;
    `;
    tab.addEventListener('mouseover', () => {
      if (!tab.classList.contains('active-tab')) {
        tab.style.color = '#ccc';
      }
    });
    tab.addEventListener('mouseout', () => {
      if (!tab.classList.contains('active-tab')) {
        tab.style.color = '#999';
      }
    });
    tab.addEventListener('click', () => {
      // Remove active state from all tabs
      tabsContainer.querySelectorAll('div').forEach(t => {
        t.style.color = '#999';
        t.style.borderBottom = 'none';
        t.classList.remove('active-tab');
      });
      
      // Set active state for clicked tab
      tab.style.color = 'white';
      tab.style.borderBottom = '2px solid #009688';
      tab.classList.add('active-tab');
      
      // Update content
      codeElement.textContent = framework.content;
    });
    
    // Add active class to first tab
    if (index === 0) {
      tab.classList.add('active-tab');
    }
    
    tabsContainer.appendChild(tab);
  });

  modalContent.appendChild(tabsContainer);

  // Create code display area with monospace font
  const codeElement = document.createElement('pre');
  codeElement.style.cssText = `
    font-family: monospace;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: #e6e6e6;
  `;
  codeElement.textContent = snippets.selenium.java; // Default to first tab
  tabContent.appendChild(codeElement);

  // Add copy button
  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy to Clipboard';
  copyButton.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 5px 10px;
    background-color: rgba(0, 150, 136, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.2s ease;
  `;
  copyButton.addEventListener('mouseover', () => {
    copyButton.style.backgroundColor = 'rgba(0, 150, 136, 0.9)';
  });
  copyButton.addEventListener('mouseout', () => {
    copyButton.style.backgroundColor = 'rgba(0, 150, 136, 0.7)';
  });
  copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(codeElement.textContent).then(() => {
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 1500);
    });
  });
  tabContent.appendChild(copyButton);

  modalContent.appendChild(tabContent);

  // Add a note about Cypress XPath usage
  if (strategy === 'xpath') {
    const cypressNote = document.createElement('div');
    cypressNote.style.cssText = `
      background-color: rgba(33, 150, 243, 0.2);
      border-radius: 4px;
      padding: 10px;
      font-size: 13px;
      margin-bottom: 15px;
    `;
    cypressNote.innerHTML = `
      <strong>Note for Cypress:</strong> To use XPath selectors in Cypress, you'll need to install and import the cypress-xpath plugin:
      <pre style="margin: 10px 0; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 3px;">
npm install -D cypress-xpath

// In your cypress/support/index.js or cypress/support/e2e.js
require('cypress-xpath');</pre>
    `;
    modalContent.appendChild(cypressNote);
  }

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}

// Function to generate Page Object Model code
function generatePageObjectModel(collection, language = 'java') {
  const pages = collection.pages;
  
  if (Object.keys(pages).length === 0) {
    return { error: 'No pages found in this collection' };
  }
  
  const pageObjectModels = {};
  
  // Generate code for each page in the collection
  Object.values(pages).forEach(page => {
    const pageTitle = page.title;
    const pageUrl = page.url;
    const elements = page.elements;
    
    if (!pageTitle || Object.keys(elements).length === 0) {
      return; // Skip pages without titles or elements
    }
    
    // Create a class name from page title
    let className = pageTitle
      .replace(/[^a-zA-Z0-9]/g, ' ')  // Replace non-alphanumeric with spaces
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Title case each word
      .join('');
    
    className = className + 'Page'; // Add Page suffix
    
    // Ensure the class name is valid
    if (!/^[a-zA-Z]/.test(className)) {
      className = 'Page' + className;
    }
    
    let code;
    
    // Java - Selenium WebDriver
    if (language === 'java') {
      code = generateJavaPageObject(className, pageUrl, elements);
    }
    // Python - Selenium WebDriver
    else if (language === 'python') {
      code = generatePythonPageObject(className, pageUrl, elements);
    }
    // JavaScript - Playwright
    else if (language === 'playwright') {
      code = generatePlaywrightPageObject(className, pageUrl, elements);
    }
    // JavaScript - Cypress
    else if (language === 'cypress') {
      code = generateCypressPageObject(className, pageUrl, elements);
    }
    // TypeScript - Playwright
    else if (language === 'typescript') {
      code = generateTypeScriptPageObject(className, pageUrl, elements);
    }
    
    pageObjectModels[className] = {
      code,
      pageTitle,
      pageUrl,
      elementCount: Object.keys(elements).length
    };
  });
  
  return pageObjectModels;
}

// Function to generate Java Selenium Page Object
function generateJavaPageObject(className, pageUrl, elements) {
  let code = `import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

/**
 * Page Object for ${className}
 * URL: ${pageUrl}
 */
public class ${className} {
    private final WebDriver driver;
    private final WebDriverWait wait;
    
    // Page URL
    private final String PAGE_URL = "${pageUrl}";
    
    // Constructor
    public ${className}(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }
    
    // Navigate to page
    public void navigate() {
        driver.get(PAGE_URL);
    }
    
    // Element locators
`;

  // Add element locators
  Object.entries(elements).forEach(([elementName, locators]) => {
    // Determine the best locator to use
    let locatorType = 'CSS';
    let locatorValue = locators.css;
    
    if (!locatorValue && locators.xpath) {
      locatorType = 'XPATH';
      locatorValue = locators.xpath;
    } else if (!locatorValue && locators.className) {
      locatorType = 'CLASS_NAME';
      locatorValue = locators.className;
    } else if (!locatorValue && locators.linkText) {
      locatorType = 'LINK_TEXT';
      locatorValue = locators.linkText;
    }
    
    if (!locatorValue) return; // Skip if no valid locator
    
    // Clean the element name to make it a valid Java method name
    const safeElementName = elementName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    
    // Add locator field
    code += `    private final By ${safeElementName}Locator = By.${locatorType.toLowerCase()}("${locatorValue}");\n`;
  });
  
  code += '\n    // Methods to interact with elements\n';
  
  // Add methods to interact with elements
  Object.entries(elements).forEach(([elementName, locators]) => {
    // Skip if no valid locator
    if (!locators.css && !locators.xpath && !locators.className && !locators.linkText) return;
    
    // Clean the element name to make it a valid Java method name
    const safeElementName = elementName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    
    // Add getter method
    code += `
    /**
     * Get the ${elementName} element
     * @return WebElement representing the ${elementName}
     */
    public WebElement get${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}() {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(${safeElementName}Locator));
    }
    
    /**
     * Click on the ${elementName} element
     */
    public void click${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}() {
        get${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}().click();
    }
`;

    // Add type method for input elements
    if (elementName.toLowerCase().includes('input') || 
        elementName.toLowerCase().includes('field') || 
        elementName.toLowerCase().includes('text')) {
      code += `
    /**
     * Type text into the ${elementName} element
     * @param text The text to type
     */
    public void type${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}(String text) {
        WebElement element = get${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}();
        element.clear();
        element.sendKeys(text);
    }
`;
    }
  });
  
  // Close the class
  code += '}\n';
  
  return code;
}

// Function to generate Python Selenium Page Object
function generatePythonPageObject(className, pageUrl, elements) {
  let code = `from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.remote.webdriver import WebDriver

class ${className}:
    """
    Page Object for ${className}
    URL: ${pageUrl}
    """
    
    # Page URL
    PAGE_URL = "${pageUrl}"
    
    def __init__(self, driver: WebDriver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)
    
    def navigate(self):
        """Navigate to the page"""
        self.driver.get(self.PAGE_URL)
    
    # Element locators
`;

  // Add element locators
  Object.entries(elements).forEach(([elementName, locators]) => {
    // Determine the best locator to use
    let locatorType = 'CSS_SELECTOR';
    let locatorValue = locators.css;
    
    if (!locatorValue && locators.xpath) {
      locatorType = 'XPATH';
      locatorValue = locators.xpath;
    } else if (!locatorValue && locators.className) {
      locatorType = 'CLASS_NAME';
      locatorValue = locators.className;
    } else if (!locatorValue && locators.linkText) {
      locatorType = 'LINK_TEXT';
      locatorValue = locators.linkText;
    }
    
    if (!locatorValue) return; // Skip if no valid locator
    
    // Clean the element name to make it a valid Python method name
    const safeElementName = elementName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    
    // Add locator field
    code += `    ${safeElementName}_locator = (By.${locatorType}, "${locatorValue}")\n`;
  });
  
  code += '\n    # Methods to interact with elements\n';
  
  // Add methods to interact with elements
  Object.entries(elements).forEach(([elementName, locators]) => {
    // Skip if no valid locator
    if (!locators.css && !locators.xpath && !locators.className && !locators.linkText) return;
    
    // Clean the element name to make it a valid Python method name
    const safeElementName = elementName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    
    // Add getter method
    code += `
    def get_${safeElementName}(self):
        """
        Get the ${elementName} element
        :return: WebElement representing the ${elementName}
        """
        return self.wait.until(EC.visibility_of_element_located(self.${safeElementName}_locator))
    
    def click_${safeElementName}(self):
        """
        Click on the ${elementName} element
        """
        self.get_${safeElementName}().click()
`;

    // Add type method for input elements
    if (elementName.toLowerCase().includes('input') || 
        elementName.toLowerCase().includes('field') || 
        elementName.toLowerCase().includes('text')) {
      code += `
    def type_${safeElementName}(self, text):
        """
        Type text into the ${elementName} element
        :param text: The text to type
        """
        element = self.get_${safeElementName}()
        element.clear()
        element.send_keys(text)
`;
    }
  });
  
  return code;
}

// Function to generate JavaScript Playwright Page Object
function generatePlaywrightPageObject(className, pageUrl, elements) {
  let code = `/**
 * Page Object for ${className}
 * URL: ${pageUrl}
 */
class ${className} {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = "${pageUrl}";
    
    // Element locators
`;

  // Add element locators
  Object.entries(elements).forEach(([elementName, locators]) => {
    // Determine the best locator to use
    let locatorValue;
    
    if (locators.css) {
      locatorValue = locators.css;
    } else if (locators.xpath) {
      locatorValue = `xpath=${locators.xpath}`;
    } else if (locators.className) {
      locatorValue = `.${locators.className}`;
    } else if (locators.linkText) {
      locatorValue = `text=${locators.linkText}`;
    } else {
      return; // Skip if no valid locator
    }
    
    // Clean the element name to make it a valid JS property name
    const safeElementName = elementName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    
    // Add locator field
    code += `    this.${safeElementName} = page.locator('${locatorValue}');\n`;
  });
  
  code += `  }
  
  /**
   * Navigate to the page
   */
  async goto() {
    await this.page.goto(this.url);
  }
  
  // Methods to interact with elements
`;
  
  // Add methods to interact with elements
  Object.entries(elements).forEach(([elementName, locators]) => {
    // Skip if no valid locator
    if (!locators.css && !locators.xpath && !locators.className && !locators.linkText) return;
    
    // Clean the element name to make it a valid JS method name
    const safeElementName = elementName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    
    // Add methods
    code += `
  /**
   * Click on the ${elementName} element
   */
  async click${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}() {
    await this.${safeElementName}.click();
  }
`;

    // Add type method for input elements
    if (elementName.toLowerCase().includes('input') || 
        elementName.toLowerCase().includes('field') || 
        elementName.toLowerCase().includes('text')) {
      code += `
  /**
   * Type text into the ${elementName} element
   * @param {string} text - The text to type
   */
  async fill${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}(text) {
    await this.${safeElementName}.fill(text);
  }
`;
    }
    
    // Add isVisible method
    code += `
  /**
   * Check if ${elementName} element is visible
   * @returns {Promise<boolean>}
   */
  async is${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}Visible() {
    return await this.${safeElementName}.isVisible();
  }
`;
  });
  
  // Close the class
  code += '}\n\nmodule.exports = { ' + className + ' };\n';
  
  return code;
}

// Function to generate Cypress Page Object
function generateCypressPageObject(className, pageUrl, elements) {
  let code = `/**
 * Page Object for ${className}
 * URL: ${pageUrl}
 */
class ${className} {
  // Element selectors
`;

  // Add element selectors
  Object.entries(elements).forEach(([elementName, locators]) => {
    // Determine the best locator to use
    let locatorValue;
    
    if (locators.css) {
      locatorValue = locators.css;
    } else if (locators.xpath) {
      locatorValue = locators.xpath; // We'll add special handling for xpath
    } else if (locators.className) {
      locatorValue = `.${locators.className}`;
    } else if (locators.linkText) {
      locatorValue = `:contains("${locators.linkText}")`;
    } else {
      return; // Skip if no valid locator
    }
    
    // Clean the element name to make it a valid JS property name
    const safeElementName = elementName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    
    // Add selector field
    if (locators.xpath) {
      code += `  ${safeElementName} = (options = {}) => cy.xpath('${locatorValue}', options)\n`;
    } else {
      code += `  ${safeElementName} = (options = {}) => cy.get('${locatorValue}', options)\n`;
    }
  });
  
  code += `
  /**
   * Visit the page
   */
  visit() {
    cy.visit('${pageUrl}');
    return this;
  }
  
  // Methods to interact with elements
`;
  
  // Add methods to interact with elements
  Object.entries(elements).forEach(([elementName, locators]) => {
    // Skip if no valid locator
    if (!locators.css && !locators.xpath && !locators.className && !locators.linkText) return;
    
    // Clean the element name to make it a valid JS method name
    const safeElementName = elementName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    
    // Add click method
    code += `
  /**
   * Click on the ${elementName} element
   * @param {Object} options - Cypress command options
   */
  click${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}(options = {}) {
    this.${safeElementName}(options).click();
    return this;
  }
`;

    // Add type method for input elements
    if (elementName.toLowerCase().includes('input') || 
        elementName.toLowerCase().includes('field') || 
        elementName.toLowerCase().includes('text')) {
      code += `
  /**
   * Type text into the ${elementName} element
   * @param {string} text - The text to type
   * @param {Object} options - Cypress command options
   */
  type${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}(text, options = {}) {
    this.${safeElementName}(options).clear().type(text);
    return this;
  }
`;
    }
    
    // Add should be visible method
    code += `
  /**
   * Verify ${elementName} element is visible
   * @param {Object} options - Cypress command options
   */
  verify${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}IsVisible(options = {}) {
    this.${safeElementName}(options).should('be.visible');
    return this;
  }
`;
  });
  
  // Close the class
  code += '}\n\nexport default ' + className + ';\n';
  
  return code;
}

// Function to generate TypeScript Playwright Page Object
function generateTypeScriptPageObject(className, pageUrl, elements) {
  let code = `import { Page, Locator } from '@playwright/test';

/**
 * Page Object for ${className}
 * URL: ${pageUrl}
 */
export class ${className} {
  readonly page: Page;
  readonly url: string;
  
  // Element locators
`;

  // Add element locators
  Object.entries(elements).forEach(([elementName, locators]) => {
    // Determine the best locator to use
    let locatorValue;
    
    if (locators.css) {
      locatorValue = locators.css;
    } else if (locators.xpath) {
      locatorValue = `xpath=${locators.xpath}`;
    } else if (locators.className) {
      locatorValue = `.${locators.className}`;
    } else if (locators.linkText) {
      locatorValue = `text=${locators.linkText}`;
    } else {
      return; // Skip if no valid locator
    }
    
    // Clean the element name to make it a valid TS property name
    const safeElementName = elementName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    
    // Add locator field
    code += `  readonly ${safeElementName}: Locator;\n`;
  });
  
  code += `
  constructor(page: Page) {
    this.page = page;
    this.url = "${pageUrl}";
    
    // Initialize locators
`;

  // Initialize locators in constructor
  Object.entries(elements).forEach(([elementName, locators]) => {
    // Determine the best locator to use
    let locatorValue;
    
    if (locators.css) {
      locatorValue = locators.css;
    } else if (locators.xpath) {
      locatorValue = `xpath=${locators.xpath}`;
    } else if (locators.className) {
      locatorValue = `.${locators.className}`;
    } else if (locators.linkText) {
      locatorValue = `text=${locators.linkText}`;
    } else {
      return; // Skip if no valid locator
    }
    
    // Clean the element name to make it a valid TS property name
    const safeElementName = elementName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    
    // Initialize locator in constructor
    code += `    this.${safeElementName} = page.locator('${locatorValue}');\n`;
  });
  
  code += `  }
  
  /**
   * Navigate to the page
   */
  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }
  
  // Methods to interact with elements
`;
  
  // Add methods to interact with elements
  Object.entries(elements).forEach(([elementName, locators]) => {
    // Skip if no valid locator
    if (!locators.css && !locators.xpath && !locators.className && !locators.linkText) return;
    
    // Clean the element name to make it a valid TS method name
    const safeElementName = elementName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    
    // Add methods
    code += `
  /**
   * Click on the ${elementName} element
   */
  async click${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}(): Promise<void> {
    await this.${safeElementName}.click();
  }
`;

    // Add type method for input elements
    if (elementName.toLowerCase().includes('input') || 
        elementName.toLowerCase().includes('field') || 
        elementName.toLowerCase().includes('text')) {
      code += `
  /**
   * Type text into the ${elementName} element
   * @param text - The text to type
   */
  async fill${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}(text: string): Promise<void> {
    await this.${safeElementName}.fill(text);
  }
`;
    }
    
    // Add isVisible method
    code += `
  /**
   * Check if ${elementName} element is visible
   */
  async is${safeElementName.charAt(0).toUpperCase() + safeElementName.slice(1)}Visible(): Promise<boolean> {
    return await this.${safeElementName}.isVisible();
  }
`;
  });
  
  // Close the class
  code += '}\n';
  
  return code;
} 

// Function to show Page Object Model modal
function showPageObjectModelModal(collection) {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2147483648;
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: rgba(34, 34, 34, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    padding: 20px;
    width: 90%;
    max-width: 1000px;
    height: 85vh;
    display: flex;
    flex-direction: column;
    color: white;
    font-family: Arial, sans-serif;
  `;

  // Create modal header
  const modalHeader = document.createElement('div');
  modalHeader.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 8px;
  `;

  const modalTitle = document.createElement('h3');
  modalTitle.textContent = 'Page Object Model Generator';
  modalTitle.style.cssText = `
    margin: 0;
    font-size: 20px;
  `;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
  `;
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });

  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);
  modalContent.appendChild(modalHeader);

  // Create description
  const description = document.createElement('div');
  description.style.cssText = `
    margin-bottom: 20px;
    color: #ccc;
    line-height: 1.5;
  `;
  description.textContent = `Generate Page Object Model code for collection "${collection.name}" containing ${Object.keys(collection.pages).length} pages.`;
  modalContent.appendChild(description);

  // Create language selection
  const languageContainer = document.createElement('div');
  languageContainer.style.cssText = `
    margin-bottom: 20px;
  `;

  const languageLabel = document.createElement('div');
  languageLabel.textContent = 'Select Language & Framework:';
  languageLabel.style.cssText = `
    margin-bottom: 8px;
    font-size: 14px;
    color: #ccc;
  `;

  const languageSelector = document.createElement('div');
  languageSelector.style.cssText = `
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  `;

  const languages = [
    { id: 'java', label: 'Java (Selenium)', selected: true },
    { id: 'python', label: 'Python (Selenium)' },
    { id: 'playwright', label: 'JavaScript (Playwright)' },
    { id: 'cypress', label: 'JavaScript (Cypress)' },
    { id: 'typescript', label: 'TypeScript (Playwright)' }
  ];

  languages.forEach(lang => {
    const langButton = document.createElement('button');
    langButton.textContent = lang.label;
    langButton.dataset.language = lang.id;
    langButton.style.cssText = `
      padding: 8px 16px;
      background-color: ${lang.selected ? 'rgba(0, 150, 136, 0.7)' : 'rgba(26, 26, 26, 0.6)'};
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s ease;
    `;
    
    langButton.addEventListener('mouseover', () => {
      if (!langButton.classList.contains('selected')) {
        langButton.style.backgroundColor = lang.selected ? 'rgba(0, 150, 136, 0.9)' : 'rgba(26, 26, 26, 0.8)';
      }
    });
    
    langButton.addEventListener('mouseout', () => {
      if (!langButton.classList.contains('selected')) {
        langButton.style.backgroundColor = lang.selected ? 'rgba(0, 150, 136, 0.7)' : 'rgba(26, 26, 26, 0.6)';
      }
    });
    
    langButton.addEventListener('click', () => {
      // Update button styles
      languageSelector.querySelectorAll('button').forEach(btn => {
        btn.style.backgroundColor = 'rgba(26, 26, 26, 0.6)';
        btn.classList.remove('selected');
      });
      
      langButton.style.backgroundColor = 'rgba(0, 150, 136, 0.7)';
      langButton.classList.add('selected');
      
      // Generate code for the selected language
      updateGeneratedCode(lang.id);
    });
    
    if (lang.selected) {
      langButton.classList.add('selected');
    }
    
    languageSelector.appendChild(langButton);
  });

  languageContainer.appendChild(languageLabel);
  languageContainer.appendChild(languageSelector);
  modalContent.appendChild(languageContainer);

  // Create code display area
  const codeContainer = document.createElement('div');
  codeContainer.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    margin-bottom: 10px;
  `;

  // Create page selector if multiple pages
  const pageSelector = document.createElement('div');
  pageSelector.style.cssText = `
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
    overflow-x: auto;
    padding-bottom: 5px;
  `;

  const generatedModels = {}; // Will store generated code by page and language
  let currentPage = null;

  // Function to update displayed code
  function updateGeneratedCode(language) {
    // Generate page objects if not already generated for this language
    if (!generatedModels[language]) {
      generatedModels[language] = generatePageObjectModel(collection, language);
    }
    
    // Clear existing page tabs and create new ones
    pageSelector.innerHTML = '';
    
    const models = generatedModels[language];
    const pageNames = Object.keys(models);
    
    if (pageNames.length === 0) {
      codeElement.textContent = 'No valid pages found with elements in this collection.';
      return;
    }
    
    // Create tab for each page
    pageNames.forEach((pageName, index) => {
      const pageModel = models[pageName];
      
      const pageTab = document.createElement('div');
      pageTab.textContent = pageName;
      pageTab.dataset.page = pageName;
      pageTab.style.cssText = `
        padding: 8px 16px;
        background-color: ${index === 0 ? 'rgba(26, 26, 26, 0.8)' : 'rgba(26, 26, 26, 0.4)'};
        color: ${index === 0 ? 'white' : '#ccc'};
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        white-space: nowrap;
        transition: all 0.2s ease;
      `;
      
      pageTab.addEventListener('mouseover', () => {
        if (pageTab.dataset.page !== currentPage) {
          pageTab.style.backgroundColor = 'rgba(26, 26, 26, 0.6)';
        }
      });
      
      pageTab.addEventListener('mouseout', () => {
        if (pageTab.dataset.page !== currentPage) {
          pageTab.style.backgroundColor = 'rgba(26, 26, 26, 0.4)';
        }
      });
      
      pageTab.addEventListener('click', () => {
        // Update active tab
        pageSelector.querySelectorAll('div').forEach(tab => {
          tab.style.backgroundColor = 'rgba(26, 26, 26, 0.4)';
          tab.style.color = '#ccc';
        });
        
        pageTab.style.backgroundColor = 'rgba(26, 26, 26, 0.8)';
        pageTab.style.color = 'white';
        
        // Update currentPage
        currentPage = pageName;
        
        // Update code
        codeElement.textContent = pageModel.code;
        
        // Update page info
        pageInfoText.innerHTML = `<strong>${pageName}</strong> - ${pageModel.elementCount} elements`;
        if (pageModel.pageUrl) {
          pageInfoText.innerHTML += `<br>URL: <span style="color: #999;">${pageModel.pageUrl}</span>`;
        }
      });
      
      pageSelector.appendChild(pageTab);
      
      // Set first page as current
      if (index === 0) {
        currentPage = pageName;
      }
    });
    
    // Set initial content to first page
    if (pageNames.length > 0) {
      const firstPage = pageNames[0];
      codeElement.textContent = models[firstPage].code;
      
      // Update page info
      pageInfoText.innerHTML = `<strong>${firstPage}</strong> - ${models[firstPage].elementCount} elements`;
      if (models[firstPage].pageUrl) {
        pageInfoText.innerHTML += `<br>URL: <span style="color: #999;">${models[firstPage].pageUrl}</span>`;
      }
    }
  }

  // Page info area
  const pageInfoContainer = document.createElement('div');
  pageInfoContainer.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  `;

  const pageInfoText = document.createElement('div');
  pageInfoText.style.cssText = `
    font-size: 12px;
    color: #ccc;
  `;

  const copyAllButton = document.createElement('button');
  copyAllButton.textContent = 'Copy All Pages';
  copyAllButton.style.cssText = `
    padding: 5px 10px;
    background-color: rgba(33, 150, 243, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.2s ease;
  `;
  copyAllButton.addEventListener('mouseover', () => {
    copyAllButton.style.backgroundColor = 'rgba(33, 150, 243, 0.9)';
  });
  copyAllButton.addEventListener('mouseout', () => {
    copyAllButton.style.backgroundColor = 'rgba(33, 150, 243, 0.7)';
  });
  copyAllButton.addEventListener('click', () => {
    // Get currently selected language
    const selectedLanguage = languageSelector.querySelector('.selected').dataset.language;
    const models = generatedModels[selectedLanguage];
    
    if (!models) return;
    
    // Combine all page objects into one string
    let allCode = '';
    Object.values(models).forEach(model => {
      if (model.code) {
        allCode += model.code + '\n\n';
      }
    });
    
    // Copy to clipboard
    navigator.clipboard.writeText(allCode).then(() => {
      const originalText = copyAllButton.textContent;
      copyAllButton.textContent = 'Copied All!';
      setTimeout(() => {
        copyAllButton.textContent = originalText;
      }, 1500);
    });
  });

  pageInfoContainer.appendChild(pageInfoText);
  pageInfoContainer.appendChild(copyAllButton);

  // Code area with copy button
  const codeWrapper = document.createElement('div');
  codeWrapper.style.cssText = `
    position: relative;
    flex: 1;
    overflow: hidden;
  `;

  const codeScroller = document.createElement('div');
  codeScroller.style.cssText = `
    height: 100%;
    overflow: auto;
    background-color: rgba(26, 26, 26, 0.6);
    border-radius: 4px;
    padding: 15px;
  `;

  const codeElement = document.createElement('pre');
  codeElement.style.cssText = `
    font-family: monospace;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: #e6e6e6;
  `;

  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy to Clipboard';
  copyButton.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 5px 10px;
    background-color: rgba(0, 150, 136, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.2s ease;
    z-index: 1;
  `;
  copyButton.addEventListener('mouseover', () => {
    copyButton.style.backgroundColor = 'rgba(0, 150, 136, 0.9)';
  });
  copyButton.addEventListener('mouseout', () => {
    copyButton.style.backgroundColor = 'rgba(0, 150, 136, 0.7)';
  });
  copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(codeElement.textContent).then(() => {
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 1500);
    });
  });

  codeScroller.appendChild(codeElement);
  codeWrapper.appendChild(codeScroller);
  codeWrapper.appendChild(copyButton);

  codeContainer.appendChild(pageSelector);
  codeContainer.appendChild(pageInfoContainer);
  codeContainer.appendChild(codeWrapper);
  modalContent.appendChild(codeContainer);

  // Notes for specific languages
  const notesContainer = document.createElement('div');
  notesContainer.style.cssText = `
    margin-top: 10px;
    font-size: 12px;
    color: #ccc;
    background-color: rgba(33, 150, 243, 0.2);
    padding: 10px;
    border-radius: 4px;
  `;
  notesContainer.innerHTML = `
    <strong>Notes:</strong>
    <ul style="margin: 5px 0 0 0; padding-left: 20px;">
      <li>Page Objects are generated based on the locators you've saved in this collection.</li>
      <li>Elements with similar patterns (input, field, text) will have type/fill methods generated automatically.</li>
      <li>Page Object Models follow best practices for each framework and language.</li>
      <li>For Cypress with XPath, you'll need to install the cypress-xpath plugin.</li>
    </ul>
  `;
  modalContent.appendChild(notesContainer);

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Initialize with the default language
  updateGeneratedCode('java');
}