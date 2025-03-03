# Select Sense

![Select Sense](https://img.shields.io/badge/Version-1.0-brightgreen)

## Intelligent Web Element Locator for Test Automation

Select Sense is a powerful Chrome extension designed to streamline web element identification and test automation. Whether you're a seasoned automation engineer or just getting started with web testing, this tool provides everything you need to efficiently locate elements and generate test code.

![Select Sense Banner](docs/assets/banner.png) <!-- Add this image to your repository -->

## 🌟 Key Features

- **Smart Element Selection**: Click on any element to instantly generate optimal locators using multiple strategies
- **Multiple Locator Strategies**: Get CSS, XPath, ID, name, class, and link text locators automatically
- **Real-time Testing**: Test your locators instantly with visual feedback
- **Code Generation**: Generate code snippets in Java, Python, JavaScript, and more
- **Page Objects**: Create complete Page Object Models for your test automation framework
- **Library Management**: Save and organize your locators for future use

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## 🔧 Installation

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) and search for "Select Sense"
2. Click the "Add to Chrome" button
3. Confirm the installation when prompted

## 🚀 Quick Start

1. **Open the extension**: Click the Select Sense icon in your browser toolbar
2. **Activate element selection**: Click the "Select Element" button in the extension panel
3. **Select an element**: Move your cursor over any element on the webpage and click to select it
4. **View locators**: The extension will display various locator strategies for the selected element
5. **Test your locators**: Click the "Test" button next to any locator to highlight the element on the page

## 📘 Usage Guide

### Element Selection

1. Activate the extension
2. Move your mouse over the desired element
3. Click to generate locators

### Testing Locators

1. Select a locator strategy (CSS, XPath, etc.)
2. Click the "Test" button
3. The element will be highlighted if found

### Saving Locators

1. Click the "Save" button
2. Choose between Library or File download
3. Enter a name for your locator
4. Select the format (JSON/CSV)

### Generating Code Snippets

1. Click the "Code Snippets" button
2. Select your preferred programming language
3. Copy the generated code

### Creating Page Objects

1. Save multiple elements to a collection
2. Click the Page Object icon
3. Select your framework and language
4. Customize the class name and settings

## 📚 Documentation

For complete documentation, see:

- [Complete Documentation](docs/index.html)
- [XPath Guide](docs/index.html#xpath-guide)
- [CSS Selector Guide](docs/index.html#css-guide)
- [Testing Guide](docs/index.html#testing-locators)

## 🧩 Common Locator Strategies

### XPath Examples

```xpath
//button[@id='submit']
//div[contains(@class, 'menu')]
//input[@type='text'][@name='username']
//a[text()='Login']
```

### CSS Selector Examples

```css
#submit
.menu-item
input[type="text"][name="username"]
button.btn-primary
```

## 🔍 Best Practices

- Start with simple selectors and add specificity as needed
- Use meaningful IDs and classes when available
- Test locators across different states of the application
- Consider dynamic content and page changes
- Save working locators to the library for future use

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Made with ❤️ by the Select Sense Team 