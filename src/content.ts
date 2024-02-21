import { IconGithubCircle } from '@iconify-prerendered/vue-mdi'

//
//
// Landing section
//
export const LangLandingTag = 'Project'
export const LangLandingTitle = 'Bluefin'
export const LangLandingText = 'The next generation Linux workstation, designed for reliability, performance, and sustainability.'
export const LangLandingBluefinImageURL = './characters/angry.webp'

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
export const LangUsersBluefinImageURL = './characters/bluefin-small.webp'
export const LangUsersAppendix = `
Updates are image-based and automatic, applications are logically separated from the system by using Flatpaks. Get what you want without sacrificing system stability. For gamers it offers a complete [Flathub](https://flathub.org) gaming experience. Check the [announcement blog post](https://www.ypsidanger.com/announcing-project-bluefin/) for more background information. 

Images are available for PC, Framework and ASUS laptops, and Microsoft Surface devices. M1/M2 Mac Support coming soon. 
`

//
//
// Parallax quote
//
export const LangParallaxQuote = {
  text: '“Evolution is a process of constant branching and expansion.”',
  author: 'Stephen Jay Gould',
  url: 'https://en.wikipedia.org/wiki/Stephen_Jay_Gould',
}

//
//
// Developers Section
//
export const LangDevsTag = 'For'
export const LangDevsTitle = 'Developers'
export const LangDevsText = 'Container focused workflows to get you started depending on where you\'re coming from, or bring your own. Wield the [industry\'s leading tools](https://landscape.cncf.io/) at your fingertips.'

export const LangDevsBoxOne = 'Visual Studio Code with devcontainers.'
export const LangDevsBoxTwo = 'Devbox - harness the power of nix without the complexity'
export const LangDevsBoxThree = 'Devpod - developer environments as code'
export const LangDevsBoxFour = 'Containerized Homebrew on-tap'
export const LangDevsTowerImageURL = './characters/devs.webp'
export const LangDevsAppendix = `The inclusion of a [container runtime](https://podman.io) unlocks your team\'s potential. Like most dromaeosaurs, she knows how to ship to production. Bluefin is designed to be [forked and extended](https://universal-blue.discourse.group/docs?topic=43) depending on your requirements, using standard cloud-native tools and techniques. 

We target Linux operators who don't use Linux on the desktop because it has failed them. So we're taking the Linux desktop through its cloud-native journey. There will be dinosaurs on this trip.

> Be the one who moves, not the one who is moved.
> <cite>[Zavala][1]</cite>

[1]: https://en.wikipedia.org/wiki/Lance_Reddick`

//
// Mission section
//
export const LangMissionTag = 'Our'
export const LangMissionTitle = 'Mission'
export const LangMissionText = `
Bluefin is not just software, she is a new breed of animal, adapted to survive the rigors of an ecosystem dominated by giants while protecting her family.

We believe that the desktop experience needs to change. Technology begins with the local computer, the device that you touch, and it should be as essential as the rest of the Linux ecosystem.

By introducing cloud-native patterns to the desktop, we hope to ignite interest in desktop computing while catering to the next generation of open-source contributors.

Bluefin is all about sustainability, encompassing software, hardware, and the people.

> There are two ways of spreading light: to be the candle or the mirror that reflects it. 
> <cite>[Edith Wharton][1]</cite>

[1]: https://en.wikipedia.org/wiki/Edith_Wharton

Or she may disembowel us on the way. Clever Girl.
`
export const LangMissionBluefinImageURL = './characters/nest.webp'

//
//
// Post mission section
//
export const LangAppendixText = `
Project Bluefin is not a finished product, she is an ongoing passion project maintained by [cloud-native enthusiasts](https://github.com/ublue-os/bluefin/graphs/contributors) who seek a more reliable and maintainable Linux desktop experience. 

She represents the state of the art … a fragile, beautiful, and unique creature. A perfect predator for a world that will that will inevitably face challenges. We must adapt. We can do it **together**.
`

// Youtube video > share > embed > copy and paste the text inside the string
export const LangAppendixYTVideo = '<iframe width="560" height="315" src="https://www.youtube.com/embed/Nz-yyDwTfRM" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>'

//
//
// Frequently asked questions
//
export const LangFaqTag = 'Unsure?'
export const LangFaqTitle = 'FAQ'
export const LangFaqText = `
If your questions remain unanswered, 
you can find us [on our Discourse forum](https://universal-blue.discourse.group/c/bluefin/6)
`
export const LangFaqQuestions = [
  {
    question: 'What is this exactly? Why did you make a Linux distribution?',
    answer: 'Bluefin utilizes Fedora\'s OCI container features to compose and build an OS image. This process is overseen by a well-structured community that is committed to automation and sustainability. The end result is akin to a configuration management tool like Ansible or Salt, but without the typical challenges associated with maintaining a custom distribution. We use the term "custom image" to describe this approach. \n\n Because it follows a cloud-native pattern, the end user has the flexibility to rebase back to the stock Fedora or any Universal Blue image. It\'s more like having someone install, configure, and maintain a polished Fedora setup for you.\n\n What is a cloud native model? \n\n [Cloud Native Desktop Model](https://youtu.be/vZ1LRe_foJY) \n [OSTree Native Containers](https://fedoraproject.org/wiki/Changes/OstreeNativeContainerStable)',
    open: true,
  },
  {
    question: 'How does this differ from other desktops?',
    answer: 'We call Bluefin "an interpretation of the Ubuntu spirit built on Fedora technology". We take the original mantra of Ubuntu\'s opinionated software decisions and apply them to Fedora Silverblue. We remove choice paralysis for users by presenting one well curated Flathub store and minimize the use of system packaging. \n\n For developers we concentrate on a pure cloud-native developer workflow via devcontainers. The command line experience is powered by the Prompt terminal and WolfiOS with Homebrew, providing access to the same packages our MacOS friends use. \n\nOr use any OCI container as your user space. \n\n [Distrobox](https://distrobox.privatedns.org/compatibility/#host-distros) \n [Flathub](https://flathub.org) \n [Devcontainers](https://containers.dev) \n [Prompt](https://gitlab.gnome.org/chergert/prompt) '
  },
  
  {
    question: 'Where can I find more details on the features?',
    answer: 'You can find detailed information in our Github repository. \n\n [Github](https://github.com/ublue-os/bluefin#readme) \n [Bluefin Documentation](https://universal-blue.discourse.group/docs?category=6) [Developer Documentation](https://universal-blue.discourse.group/docs?topic=39)',
    open: true,
  },
  {
    question: 'Why dinosaurs??',
    answer: 'Bluefin is a Deinonychus antirrhopus, a theropod dinosaur whose name means "terrible claw". Discovered in the 1960s, she revolutionized our understanding of dinosaurs. Before Deinonychus, dinosaurs were often seen as slow, dim-witted creatures. However, she shattered these misconceptions, offering insight into the dynamic world of hot-blooded, rapidly evolving animals that were masters of their domain. We aim for our desktop to embody a similar nimbleness. Power and adaptability. \n\n [Deinonychus](https://en.wikipedia.org/wiki/Deinonychus)',
  },
  {
    question: 'What if I want something like KDE or another window manager?',
    answer: 'Bluefin is an opinionated GNOME experience. However Universal Blue provides a maintained set of base images for anyone to be able to make a custom image. We hope Bluefin acts as an inspiration for others to build their own communities around user experiences. For example check out Bazzite if you want a great KDE gaming experience, similar to SteamOS. \n\n [Base Images](https://universal-blue.org/images/) \n [Bazzite](https://bazzite.gg)',
  },
  {
    question: 'What do the Asus, Framework, and Surface images do?',
    answer: 'The Asus and Surface images ship the asus-linux.org and linux-surface kernels, respectively. The Framework image ships recommended power settings for the Framework 13 laptop. All of them allow for user-overridden configuration. \n\n [Framework](https://universal-blue.org/images/framework/) \n [Surface](https://universal-blue.org/images/surface/) \n [Asus](https://universal-blue.org/images/asus/)',
  },
  {
    question: 'I\'m not interested in a desktop, can I just get the dinosaurs?',
    answer: 'Bluefin was brought to life by Jacob Schnurr and Andy Frazer. The artwork is free for you to use. It represents the delicate balance of life and is there to remind us that open source is an ecosystem that needs to be sustained. The software we make has an effect on the world: Bluefin might be put together by technology nerds, but it took two humans to show us the importance of the creativity of the human mind. \n\n [Wallpapers and Dinosaurs](https://universal-blue.discourse.group/t/dinosaur-gallery/18/5) \n [Jacob Schnurr](https://www.etsy.com/shop/JSchnurrCommissions?listing_id=1425657775) \n [Andy Frazer](https://www.etsy.com/fi-en/shop/DragonsofWales?ref=profile_header)',
  },
]

//
//
// Footer content
//
export const LangFooterProjectTitle = 'Project Bluefin'
export const LangFooterProject = 'Bluefin is built with [Universal Blue](https://universal-blue.org), a community toolkit designed to reboot the Linux desktop. Built for the love of the game. Welcome to indie Cloud Native.'
export const LangFooterReferences = `All artwork built by humans.
<br><br>
- Website - [Jan Dolanský](https://dolansky.dev/)
- Logos and Wallpapers - [Jacob Schnurr](https://www.etsy.com/shop/JSchnurrCommissions?listing_id=1425657775) 
- Bluefin Illustrative Wallpaper - Andy Frazer, [DragonsofWales](https://www.etsy.com/fi-en/shop/DragonsofWales?ref=profile_header)
- Special Thanks - [Aaron Lake](https://www.linkedin.com/in/aaron-lake/), [Brian Ketelsen](https://brian.dev/), [Dustin Kirkland](https://www.kotterva.com/), and [Marco Ceppi](https://github.com/marcoceppi)`

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
