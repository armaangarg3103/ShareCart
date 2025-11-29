// Function to load navbar into page
async function loadNavbar() {
    try {
        const response = await fetch('../components/navbar.html');
        const html = await response.text();
        
        // Insert navbar at the beginning of body
        const body = document.body;
        const navbarDiv = document.createElement('div');
        navbarDiv.innerHTML = html;
        body.insertBefore(navbarDiv.firstElementChild, body.firstChild);
        body.insertBefore(navbarDiv.querySelector('nav'), body.firstChild);
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
}

// Auto-load navbar when script is included
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavbar);
} else {
    loadNavbar();
}
