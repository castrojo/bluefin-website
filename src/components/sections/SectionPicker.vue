<script lang='ts'>
let hasScrolled = false;

function handleSelectedHardwareChange() {
  const selectedHardware = (document.getElementById('selectedHardware') as HTMLSelectElement).value;
  const gpuElements = document.querySelectorAll('#image-builder .gpu');
  const developerElements = document.querySelectorAll('#image-builder .developer');

  if (selectedHardware !== '') {
    gpuElements.forEach((element) => {
      element.classList.remove('hidden-fade');
      element.classList.add('shown-fade');
    });

    developerElements.forEach((element) => {
      element.classList.remove('hidden-fade');
      element.classList.add('shown-fade');
    });
  } else {
    gpuElements.forEach((element) => {
      element.classList.add('hidden-fade');
      element.classList.remove('shown-fade');
    });

    developerElements.forEach((element) => {
      element.classList.add('hidden-fade');
      element.classList.remove('shown-fade');
    });
  }
}

function handleGPUVendorChange() {
  const selectedGPU = (document.getElementById('gpuVendor') as HTMLSelectElement).value;
  const developerElements = document.querySelectorAll('#image-builder .developer');

  if (selectedGPU !== '') {
    developerElements.forEach((element) => {
      element.classList.remove('hidden-fade');
      element.classList.add('shown-fade');
    });
  } else {
    developerElements.forEach((element) => {
      element.classList.add('hidden-fade');
      element.classList.remove('shown-fade');
    });
  }
}

function handleInputChange() {
  const hardware = getInputValue('#selectedHardware');
  const gpuVendor = getInputValue('#gpuVendor');
  const isDeveloper = getInputValue('#isDeveloper');

  let imagename = 'bluefin';

  if (isDeveloper === 'yes') {
    imagename += '-dx';
  }

  switch (hardware) {
    case 'asus':
      imagename += '-asus';
      break;
    case 'surface':
      imagename += '-surface';
      break;
    case 'framework':
      imagename += '-framework';
      break;
  }

  if (gpuVendor === 'nvidia') {
    imagename += '-nvidia';
  }

  const resultElement = document.getElementById('image-builder-result');
  if (imagename !== '' && hardware != '' && gpuVendor != '' && isDeveloper != '') {
    resultElement?.classList.remove('hidden-fade');
    resultElement?.classList.add('shown-fade');

    document.querySelector('.image-name').textContent = imagename;
    document.querySelector('.button-download')?.setAttribute('href', `https://download.bazzite.gg/${imagename}-stable.iso`);
    document.querySelector('.sha256')?.setAttribute('href', `https://download.bazzite.gg/${imagename}-stable-CHECKSUM`);
    document.querySelector('.ghcr-details')?.setAttribute('href', `https://ghcr.io/ublue-os/${imagename}`);

    if (!hasScrolled) {
      document.querySelector('html, body')?.animate({
        scrollTop: (resultElement?.offsetTop || 0) - (document.getElementById('mfn-header-template')?.offsetHeight || 0) - 30
      }, 500);

      hasScrolled = true;
    }
  } else {
    resultElement?.classList.add('hidden-fade');
    resultElement?.classList.remove('shown-fade');
  }
}

function getInputValue(selector: string): string {
  const inputElement = document.querySelector(selector) as HTMLSelectElement | null;
  return inputElement?.parentElement?.classList.contains('hidden-fade') ? '' : inputElement?.value || '';
}

// Event listeners
document.querySelector('#image-builder #selectedHardware')?.addEventListener('change', handleSelectedHardwareChange);
document.querySelector('#image-builder #gpuVendor')?.addEventListener('change', handleGPUVendorChange);
document.querySelector('#image-builder #selectedHardware, #image-builder #gpuVendor, #image-builder #isDeveloper')?.addEventListener('change', handleInputChange);
</script>

<template>
  <section id="scene-picker" class="section-wrap">
    <div class="container moderate">
      <div class="image-picker-half">
        <form id="image-builder" autocomplete="off">
          <div class="selectedHardware">
            <label for="selectedHardware">What hardware are you using?</label>
            <select id="selectedHardware" name="hardware">
              <option disabled selected value>Select your hardware</option>
              <option value="desktop">Desktop</option>
              <optgroup label="Laptops">
                <option value="framework">Framework Laptop</option>
                <option value="surface">Surface Laptop</option>
                <option value="asus">ASUS Laptop</option>
                <option value="desktop">Other Laptop</option>
              </optgroup>
            </select>
          </div>
          <div class="gpu hidden-fade">
            <label for="gpuVendor">Who is the vendor of your primary GPU?</label>
            <select id="gpuVendor" name="gpuVendor">
              <option disabled selected value>Select your primary GPU vendor</option>
              <option value="amd">AMD</option>
              <option value="nvidia">Nvidia</option>
              <option value="intel">Intel</option>
            </select>
          </div>
          <div class="developer hidden-fade">
            <label for="isDeveloper">Are you a developer?</label>
            <select id="isDeveloper" name="isDeveloper">
              <option disabled selected value>Select if you want developer tools included</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </form>
      </div>
      <div class="image-picker-half">
        <div id="image-builder-result" class="hidden-fade">
          <span class="iso-selection">
            <h3>New Users</h3>
            <div class="button-download-container">
              <a class="button-download button has-icon button_right">
                <span class="button_icon">
                  <i class="fas fa-download"></i>
                </span>
                <span class="button_label">Download the <span class="bazzite-name image-name"></span> ISO</span>
              </a>
              <a class="sha256" title="Verify (SHA256)"><i class="fas fa-file"><i class="fas fa-check"></i></i></a>
            </div>
            <span class="fine-print">View our initial setup guide <a href="https://universal-blue.discourse.group/docs?topic=30" target="_blank">here</a>.<br>
            The full list of documentation can be found <a href="https://docs.bazzite.gg/" target="_blank">here</a>.</span>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
