import { IconGithubCircle } from '@iconify-prerendered/vue-mdi'

//
//
// Landing section
//
export const LangLandingTag = 'Project'
export const LangLandingTitle = 'Bluefin'
export const LangLandingText = 'The next generation Linux workstation, designed for reliability, performance, and sustainability.'
export const LangLandingBluefinImageURL = './characters/angry.png'

//
//
// Users section
//
export const LangUsersTag = 'For'
export const LangUsersTitle = 'You'
export const LangUsersText = 'Bluefin is a custom image of Fedora Silverblue. The best of both worlds: the reliability and ease of use of a Chromebook, with the power of a GNOME desktop.'
export const LangUsersListItems = [
  'Applications by Flathub',
  'Near-zero maintenance',
  'Included GPU drivers',
]
export const LangUsersBluefinImageURL = './characters/bluefin-small.png'
export const LangUsersAppendix = `
Updates are image-based and automatic. Applications are logically separated from the system by using Flatpaks. When combined with native container workflows it provides a generational leap in reliability and composability. Get what you want without sacrificing system stability. 

Images are available for your PC, M1/M2 Macs, and Framework laptops.
`

//
//
// Parallax quote
//
export const LangParallaxQuote = {
  text: '“Evolution is a process of constant branching and expansion”',
  author: 'Stephen Jay Gould',
  url: 'https://en.wikipedia.org/wiki/Stephen_Jay_Gould',
}

//
//
// Developers Section
//
export const LangDevsTag = 'For'
export const LangDevsTitle = 'Developers'
export const LangDevsText = 'Four developer workflows to get you started depending on where you\'re coming from, or bring your own. Wield the [industry\'s leading tools](https://landscape.cncf.io/) at your fingertips.'

export const LangDevsBoxOne = 'Built-in Ubuntu user space integrated with Visual Studio Code. Run any OCI container as your developer environment.'
export const LangDevsBoxTwo = 'Devbox and Fleek - harness the power of nix without the complexity'
export const LangDevsBoxThree = 'Devpod - developer environments as code'
export const LangDevsBoxFour = 'Homebrew on-tap'
export const LangDevsTowerImageURL = './characters/devs.png'
export const LangDevsAppendix = `The inclusion of a [container runtime](https://glossary.cncf.io/runtime/) unlocks your team\'s potential - like most dromaeosaurs, she knows how to ship to production. 
<br><br>
Bluefin is designed to be [forked and extended](https://universal-blue.org/tinker/fork-your-own) depending on your requirements, using standard cloud-native tools and techniques.`

//
//
// Mission section
//
export const LangMissionTag = 'Our'
export const LangMissionTitle = 'Mission'
export const LangMissionText = `
Bluefin is not just software, she is a new breed of animal, adapted to survive the rigors of an ecosystem dominated by giants while protecting her family.

We believe that the desktop experience needs to change. That technology starts with your local computer, the device that touches your hands, and that has to be as important as the rest of the Linux ecosystem. 

By bringing cloud-native patterns to the desktop we hope to kickstart an open source alternative desktop while catering to the next-generation of open source contributor. 

Bluefin is about sustainability of the software, the hardware, and the people.

> There are two ways of spreading light: to be the candle or the mirror that reflects it. 
> <cite>[Edith Wharton][1]</cite>

[1]: https://en.wikipedia.org/wiki/Edith_Wharton

Or she may disembowel us on the way. Clever Girl.
`
export const LangMissionBluefinImageURL = './characters/nest.png'

//
//
// Post mission section
//
export const LangAppendixText = `
Project Bluefin is not a finished product, she is an ongoing passion project maintained by systems engineers who want a more reliable and maintainable Linux desktop experience. 

She represents the state of the art … a fragile, beautiful, and unique creature. The perfect predator for a world that will ultimately die. We must adapt. **We can do it together**.

Bluefin is built with [Universal Blue](https://universal-blue.org), a community toolkit designed to reboot the Linux desktop. Built for the love of the game. *Welcome to indie cloud-native*.
`

// Youtube video > share > embed > copy and paste the text inside the string
export const LangAppendixYTVideo = '<iframe width="560" height="315" src="https://www.youtube.com/embed/XCE8H3dKJm4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>'

//
//
// Frequently asked questions
//
export const LangFaqTag = 'Unsure?'
export const LangFaqTitle = 'FAQ'
export const LangFaqText = `
If your questions remain unanswered, 
you can find us [on GitHub](https://github.com/ublue-os/bluefin)
`
export const LangFaqQuestions = [
  {
    question: 'What is this exactly? Why did you make a Linux distribution?',
    answer: 'Bluefin uses Fedora\'s OCI features to compose and build an OS image. This is maintained by a well structured community dedicated to automation and sustainability. The end result is similar to a configuration management tool such as Ansible or Salt without the usual problems associated with maintaining a custom distribution. Since it\'s a cloud-native approach the end user can rebase back to stock Fedora or any Universal Blue image. It\'s more akin to having someone install, configure, and maintain a slick Fedora setup for you. \n\n What is a cloud native model? \n\n [Cloud Native Desktop Model](https://youtu.be/vZ1LRe_foJY) \n [OSTree Native Containers](https://fedoraproject.org/wiki/Changes/OstreeNativeContainerStable)',
    open: true,
  },
  {
    question: 'Where can I find more details on the features?',
    answer: 'You can find detailed information in our Github repository. \n\n [Github](https://github.com/ublue-os/bluefin#readme) \n [Documentation](https://universal-blue.org/images/bluefin/)',
    open: true,
  },
  {
    question: 'What if I want something like KDE or another window manager?',
    answer: 'Bluefin is an opinionated GNOME experience. However Universal Blue provides a maintained set of base images for anyone to be able to make a custom image. We hope Bluefin acts as an inspiration for others to build their own communities around user experiences. For example check out Bazzite if you want a great KDE gaming experience, similar to SteamOS. \n\n [Base Images](https://universal-blue.org/images/) \n [Bazzite](https://universal-blue.org/images/bazzite/)',
  },
  {
    question: 'What do the Framework images do?',
    answer: 'These follow Framework\'s recommendations to swap out gnome-power-profile with tlp. The recommended settings are included on the image by default, but allow for user-overridden configuration. \n\n [Framework](https://universal-blue.org/images/bluefin/framework/)',
  },
  {
    question: 'What if I don\'t like Ubuntu? What are my options?',
    answer: 'All good distros have well maintained cloud images, you can use just about all of them. Bluefin/Alpine is the creators\'s preferred personal setup. Bluefin consumes distro images at her leisure. \n\n [Distrobox](https://distrobox.privatedns.org/compatibility/#host-distros)',
  },
  {
    question: 'I\'m not interested in a desktop, can I just get the dinosaurs?',
    answer: 'Bluefin was brought to life by Jacob Schurr and Andy Frazer. The artwork is free for you to use \n\n [Wallpapers](https://github.com/ublue-os/bluefin) \n [Dinosaurs](https://github.com/ublue-os/bluefin) \n [HEIC Wallpapers for OSX](https://github.com/ublue-os/bluefin) \n [Jacob Schnurr](https://www.etsy.com/listing/1425657775/cretaceous-chonkers-chonky-dinosaur) \n [Andy Frazer](https://www.etsy.com/fi-en/shop/DragonsofWales?ref=profile_header)', 
  },
]

//
//
// Footer content
//
export const LangFooterProjectTitle = 'Project Bluefin'
export const LangFooterProject = 'Bluefin is built with [Universal Blue](https://universal-blue.org), a community toolkit designed to reboot the Linux desktop. Built for the love of the game. Welcome to Indie Cloud Native.'
export const LangFooterReferences = `All artwork built by humans.
<br><br>
- Logos and Wallpapers - [Jacob Schnurr](https://www.etsy.com/listing/1425657775/cretaceous-chonkers-chonky-dinosaur) 
- Bluefin Wallpaper - Andy Frazer, [DragonsofWales](https://www.etsy.com/fi-en/shop/DragonsofWales?ref=profile_header)
- Website - [Jan Dolanský](https://dolansky.dev/)
- Project Management - Aaron Lake 
- Product Management - Dustin Kirkland`

// The icons are taken from here
// https://icones.js.org/collection/mdi
export const LangSocialLinks = [
  {
    component: IconGithubCircle,
    text: 'Github',
    link: 'https://github.com/ublue-os/bluefin',
  },
]

// Footer logos (powered-by)
interface PoweredBy { imageUrl: string; projectUrl?: string; altText: string }
export const LangPoweredBy: PoweredBy[] = [
  {
    // This one will point to the logos saved in the public folder
    // You can also link to an external asset if needed
    imageUrl: './brands/fedora.png',
    projectUrl: 'https://fedoraproject.org/',
    altText: 'Fedora',
  },
  {
    imageUrl: './brands/devpod.svg',
    projectUrl: 'https://devpod.sh/',
    altText: 'Devpod',
  },
  {
    imageUrl: './brands/devbox.svg',
    projectUrl: 'https://www.jetpack.io/devbox/',
    altText: 'Devbox',
  },
  {
    imageUrl: './brands/podman-logo-dark.png',
    projectUrl: 'https://podman.io/',
    altText: 'Podman',
  },
  {
    imageUrl: './brands/ubuntu.svg',
    projectUrl: 'https://ubuntu.com/',
    altText: 'Ubuntu',
  },
  {
    imageUrl: './brands/dontrememberthisbrand.svg',
    projectUrl: 'https://distrobox.privatedns.org/',
    altText: 'Distrobox',
  },
]
