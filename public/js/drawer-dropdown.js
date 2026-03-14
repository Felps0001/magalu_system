function setupDrawerDropdown(detailsElement) {
  const summary = detailsElement.querySelector('summary');
  const content = detailsElement.querySelector('.feed-drawer-subnav');

  if (!summary || !content) {
    return;
  }

  let isAnimating = false;

  content.style.overflow = 'hidden';
  content.style.height = detailsElement.open ? 'auto' : '0px';
  content.style.opacity = detailsElement.open ? '1' : '0';

  function finishAnimation(isOpen) {
    isAnimating = false;
    detailsElement.classList.remove('feed-drawer-group--animating');
    detailsElement.open = isOpen;
    content.style.transition = '';
    content.style.height = isOpen ? 'auto' : '0px';
    content.style.opacity = isOpen ? '1' : '0';
  }

  summary.addEventListener('click', (event) => {
    event.preventDefault();

    if (isAnimating) {
      return;
    }

    const isOpening = !detailsElement.open;
    const startHeight = content.getBoundingClientRect().height;

    detailsElement.classList.add('feed-drawer-group--animating');
    detailsElement.open = true;

    const endHeight = isOpening ? content.scrollHeight : 0;

    content.style.height = `${startHeight}px`;
    content.style.opacity = isOpening ? '0' : '1';

    requestAnimationFrame(() => {
      isAnimating = true;
      content.style.transition = 'height 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease';
      content.style.height = `${endHeight}px`;
      content.style.opacity = isOpening ? '1' : '0';
    });

    window.setTimeout(() => {
      finishAnimation(isOpening);
    }, 230);
  });
}

document.querySelectorAll('.feed-drawer-group').forEach((detailsElement) => {
  setupDrawerDropdown(detailsElement);
});