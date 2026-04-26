export interface BlogSection {
  heading?: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  authorRole: string;
  date: string;
  readMin: number;
  category: string;
  coverImage: string;
  sections: BlogSection[];
}

export const POSTS: BlogPost[] = [
  {
    slug: 'app-fraud-why-money-is-gone',
    title: 'Authorised Push Payment Fraud: Why the Money Is Already Gone Before Anyone Notices',
    subtitle: 'APP scams are now the dominant fraud category in Europe. Understanding why they work so well is the first step to stopping them.',
    author: 'Marta Lindqvist',
    authorRole: 'Head of Fraud Research',
    date: '2026-04-14',
    readMin: 7,
    category: 'Fraud Trends',
    coverImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80',
    sections: [
      {
        paragraphs: [
          'Somewhere in the United Kingdom right now, a retired teacher is on the phone with someone claiming to be from her bank. The caller is polite, knowledgeable, and slightly alarmed on her behalf. He knows her name, her sort code, and the last four digits of her card. He tells her that her account has been compromised and that she needs to move her savings to a safe account immediately. She logs into her banking app and sends thirty thousand pounds to an account she has never seen before. The money leaves in seconds.',
          'By the time she calls her real bank the next morning, the funds have passed through three accounts in two different jurisdictions. The bank tells her the transaction was authorised. She approved it herself, with her own credentials, her own device, and her own fingerprint. There is no breach. There is no malware. And in most countries, there is no clear obligation to refund her.',
        ],
      },
      {
        heading: 'What makes APP fraud different from everything else',
        paragraphs: [
          'Authorised Push Payment fraud is not a new concept, but the scale at which it now operates is unlike anything the industry has dealt with before. In the UK alone, losses exceeded 460 million pounds in 2024. In the eurozone, regulators are tracking a 40 percent year-on-year increase in reported cases. The defining feature of every single one of these cases is the same: the victim did it themselves.',
          'This is what separates APP fraud from card fraud, account takeover, or identity theft. Those categories involve unauthorised access to someone else\'s account. APP fraud requires the account holder to be present, authenticated, and cooperative. The fraud does not happen to the customer. It happens through the customer. And that single distinction breaks almost every fraud prevention system built in the last twenty years.',
          'Traditional fraud detection asks: is this the right person? APP fraud exploits the fact that the answer to that question is yes. Every signal that says "this is a legitimate user" is accurate. The credential check passes. The biometric matches. The device is recognised. The only thing that is wrong is the intent behind the transaction, and no system that checks identity can detect that.',
        ],
      },
      {
        heading: 'The three phases of a successful scam',
        paragraphs: [
          'Most APP fraud follows a recognisable pattern, even when the scripts and personas vary. The first phase is targeting. Fraudsters build or purchase lists of potential victims and qualify them by age, account size, and psychological profile. Older account holders with larger savings balances and less familiarity with how banks communicate are disproportionately targeted, but the idea that only the vulnerable fall for these scams is false. Educated, high-income professionals are defrauded at significant rates. The scripts are simply calibrated differently.',
          'The second phase is the call itself. The caller establishes authority and creates urgency. They have usually done enough research to sound credible. They know which bank the victim uses, sometimes they know recent transaction details purchased from data brokers, and they are skilled at reading and managing emotional responses. The combination of authority, urgency, and partial inside knowledge creates a psychological state where the victim stops questioning and starts complying.',
          'The third phase is the instruction. This is where the victim is asked to take an action: transfer money, approve a payment, install an app, or simply stay on the line while the fraudster does the rest remotely. The key insight is that by the time the victim reaches their banking app, their decision has already been made for them. What the bank sees is a normal user completing a normal payment. What is actually happening is a person following instructions under psychological duress.',
        ],
      },
      {
        heading: 'Why recovery rates are so low',
        paragraphs: [
          'The speed of modern payment rails works against victims almost entirely. Real-time payment systems process transfers in seconds. By the time a victim realises something is wrong and contacts their bank, which on average happens 18 hours after the fraud, the money has moved multiple times. Banks can freeze and trace accounts, but the coordination required across institutions and borders takes days, and the funds are typically converted or withdrawn within hours.',
          'Legal recovery is similarly difficult. In jurisdictions without mandatory reimbursement schemes, victims are often told that because they authorised the payment, the bank bears no liability. Even where reimbursement rules exist, disputes about whether the victim took reasonable care are common and rarely resolved quickly.',
        ],
      },
      {
        heading: 'Where the solution actually lives',
        paragraphs: [
          'If APP fraud exploits the gap between who is transacting and whether they are acting freely, the solution has to close that gap. It cannot live at the authentication layer, because authentication is not the problem. It has to live at the point of transaction itself, reading the signals that indicate whether this person is behaving normally or whether they are acting under instruction.',
          'Behavioral analysis is the only tool positioned to do this. Not behavioral biometrics in the traditional identity-verification sense, but something more specific: comparison of the current session against the individual\'s own historical behavior to detect anomalies that indicate external influence. The question is not "is this the right person?" The question is "is this person acting the way they normally act?" That is a different question, and it has a different answer.',
        ],
      },
    ],
  },
  {
    slug: 'sca-wrong-problem',
    title: 'Strong Customer Authentication Was Designed for the Wrong Problem',
    subtitle: 'PSD2 mandated two-factor authentication across Europe. APP fraud went up anyway. The regulation solved the problem it was built for, and missed the one that mattered.',
    author: 'Tomas Vrabel',
    authorRole: 'Regulatory Affairs',
    date: '2026-03-28',
    readMin: 6,
    category: 'Regulation',
    coverImage: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=1200&q=80',
    sections: [
      {
        paragraphs: [
          'Strong Customer Authentication became mandatory across the European Economic Area in September 2021, after several years of extensions and delays. The policy requirement was clear: online payments above a certain threshold must be authenticated using at least two of three factors, something you know, something you have, and something you are. Banks that failed to implement compliant SCA flows faced regulatory action.',
          'The fraud data from the two years that followed was, depending on how you look at it, either a partial success or a complete failure. Card-not-present fraud, the category SCA was specifically designed to address, fell significantly in markets with strong SCA enforcement. But total payment fraud losses continued to rise, driven by a category that SCA was never designed to address: authorised push payments.',
        ],
      },
      {
        heading: 'What SCA actually does',
        paragraphs: [
          'SCA is an authentication mechanism. Its purpose is to verify that the person attempting a transaction is the legitimate account holder. By requiring a second factor, typically a one-time code sent to a registered device or a biometric verification, it raises the cost and difficulty of account takeover and card fraud. A fraudster who has stolen your card details but not your phone cannot complete a payment under SCA. This is a genuine, meaningful improvement in security.',
          'The problem is that APP fraud does not involve a fraudster completing a payment. It involves you completing a payment. You are present. You have your device. You know your password. You provide the biometric. Every SCA requirement is satisfied, with full cooperation from the person being defrauded. The authentication succeeds because authentication is not the problem.',
        ],
      },
      {
        heading: 'The liability question that PSD2 left unanswered',
        paragraphs: [
          'PSD2 contains clear rules about liability for unauthorised transactions. If someone takes money from your account without your permission, the bank is generally required to refund it, subject to some conditions about gross negligence. These rules have been tested and are reasonably well understood across the industry.',
          'But for authorised transactions where the customer was deceived into approving them, PSD2 provides almost no guidance. The directive was written against a threat model that assumed fraud required unauthorised access. When the customer authorises the transaction themselves, the legal framework treats it as a legitimate payment. Some national regulators have added voluntary or mandatory reimbursement schemes on top of PSD2, but these vary enormously by jurisdiction and are frequently contested.',
          'This is not a criticism of the regulation as written. It addressed the problem it was designed for. The issue is that the fraud industry moved faster than the regulatory framework, and PSD2 has been playing catch-up ever since.',
        ],
      },
      {
        heading: 'What PSD3 is trying to fix',
        paragraphs: [
          'The PSD3 framework, which will phase in across the EU through 2026 and 2027, takes a different approach to authorised payment fraud. For the first time, it begins to address the concept of manipulation at the point of payment, introduces clearer liability obligations for banks when customers are defrauded through social engineering, and requires that payment service providers implement controls proportionate to the risk of the payment.',
          'The phrase "controls proportionate to the risk" is important. It opens the door to behavioral monitoring as a compliance requirement, not just a commercial choice. If a bank can show that it detected anomalous behavior before a high-value payment was processed, it may be able to demonstrate that it met its duty of care. If it cannot, the liability question becomes much more difficult to answer.',
        ],
      },
      {
        heading: 'The gap between compliance and protection',
        paragraphs: [
          'There is a version of SCA compliance that involves ticking every regulatory box without meaningfully reducing fraud risk. Many banks are in this position today. They have implemented all required authentication flows, passed all audits, and continue to see APP fraud losses climb.',
          'The banks that are beginning to reduce these losses are the ones that treat SCA as a floor rather than a ceiling. Authentication is necessary but not sufficient. What sits above it, the layer that watches how a customer behaves during a session and asks whether that behavior is consistent with previous sessions, is where the actual protection lives. Regulation will eventually catch up to this view. Forward-looking institutions are not waiting for it to.',
        ],
      },
    ],
  },
  {
    slug: 'behavioral-biometrics-explained',
    title: 'What Behavioral Biometrics Actually Measures (and What It Misses)',
    subtitle: 'Typing cadence, mouse movement, and scroll patterns are real signals. But most behavioral biometrics products are solving identity verification, not fraud prevention.',
    author: 'Ingrid Hoffmann',
    authorRole: 'Product Research',
    date: '2026-03-15',
    readMin: 8,
    category: 'Technology',
    coverImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    sections: [
      {
        paragraphs: [
          'Behavioral biometrics has been part of fraud prevention conversations for about a decade. The core idea is that every person interacts with digital devices in a distinctive way. The rhythm of their keystrokes, the characteristic curves of their mouse movements, the pattern of their scrolling and tapping, all of these create a behavioral fingerprint that is harder to steal or replicate than a password or even a physical biometric.',
          'The technology is genuinely impressive. Modern systems can identify a returning user with high confidence from a few hundred keystrokes, without any explicit authentication step. They can detect when a different person has taken over a session mid-flow, even if the session authenticated correctly at the start. For the specific problem of account takeover, behavioral biometrics is probably the best continuous authentication tool available.',
        ],
      },
      {
        heading: 'The identity verification use case',
        paragraphs: [
          'Most behavioral biometrics products are designed around identity verification. The system enrolls a user over several sessions, builds a statistical model of how they interact with their device, and then compares each new session against that model. A significant deviation triggers a flag: this might not be the enrolled user.',
          'This works well for several fraud scenarios. If a fraudster purchases stolen credentials and tries to access an account, their behavioral profile will not match the legitimate user\'s. If a session is hijacked partway through, the handover is detectable. If an automated script is running through a payment flow, its mechanical precision stands out clearly against a human behavioral baseline.',
          'These are real threats, and reducing them has genuine value. But they all share a common assumption: that the fraudster is trying to impersonate the legitimate user. APP fraud makes the opposite assumption. The legitimate user is doing the transaction. The fraudster is not present on the device at all.',
        ],
      },
      {
        heading: 'What happens when the user is the problem',
        paragraphs: [
          'When a victim of an APP scam logs into their banking app and initiates a transfer, their behavioral biometrics look almost normal. It is them. Their typing has their rhythm. Their mouse movements have their characteristic pattern. They are navigating the app the same way they always have. If anything is different, it is subtle: slightly elevated keystroke error rate from trembling hands, longer pauses before critical steps, unusually linear navigation because they are following verbal instructions rather than exploring naturally.',
          'Standard behavioral biometrics systems will not catch this. They are comparing the session against the user\'s historical profile and finding a reasonable match. The comparison is correct. The inference is wrong.',
          'The useful comparison is not between this session and the user\'s average. It is between this session and the user\'s normal behavior during similar transactions. High-value payments, first-time payees, large round-number transfers. What does this specific user normally do when they make a payment like this? Do they re-read the beneficiary details multiple times? Do they pause on the confirmation screen? Do they typically arrive at the payment page from their account overview, or do they navigate directly? These transaction-specific behavioral patterns are much more predictive than aggregate session metrics.',
        ],
      },
      {
        heading: 'The baseline problem',
        paragraphs: [
          'Building genuinely useful behavioral models for fraud detection requires enough data to understand what normal looks like for a specific individual in a specific context. This takes time. Most behavioral biometrics vendors report that their models reach operational confidence after somewhere between thirty and a hundred sessions. For users who log in rarely, or who have recently changed devices, the baseline is thin.',
          'This is a real limitation, and any honest evaluation of behavioral biometrics should acknowledge it. The system is most powerful for frequent users with established patterns. For a customer who logs into their banking app twice a year, the model has very little to compare against.',
          'The practical response to this is a tiered approach. New users or users with thin baselines are handled by population-level models, essentially asking whether their behavior is unusual compared to verified-legitimate sessions from similar users. As individual history accumulates, the model shifts toward personal comparison. Neither approach is perfect, but together they provide meaningful coverage across the user base.',
        ],
      },
      {
        heading: 'Where the field is heading',
        paragraphs: [
          'The most interesting developments in behavioral fraud detection are not in the sensor layer, measuring keystrokes and mouse movements more precisely, but in the interpretation layer. What behavioral pattern indicates that a user is under stress, acting under instruction, or uncertain about what they are doing? These are hard questions and the research is genuinely early-stage.',
          'Some signals are promising. Pre-confirmation pause duration correlates with deception detection studies from psychology literature. Scroll depth on warning screens reflects whether a user is actually reading fraud notices. Time-between-incoming-call and transaction-initiation is a strong composite signal that nobody was measuring until recently. These are not identity signals. They are intent signals, and that distinction is what makes them relevant to APP fraud in a way that traditional behavioral biometrics is not.',
        ],
      },
    ],
  },
  {
    slug: 'psychology-of-phone-scams',
    title: 'The Psychology Behind Phone Scams: How Fraudsters Override Good Judgment',
    subtitle: 'Victims of APP fraud are not stupid or careless. They are people who have been subjected to a systematic and well-practised attack on their decision-making.',
    author: 'Marta Lindqvist',
    authorRole: 'Head of Fraud Research',
    date: '2026-03-02',
    readMin: 7,
    category: 'Security Research',
    coverImage: 'https://images.unsplash.com/photo-1573164574572-cb89e39749b4?auto=format&fit=crop&w=1200&q=80',
    sections: [
      {
        paragraphs: [
          'One of the most damaging things the industry says about APP fraud victims is that they should have known better. It is said by bank customer service agents when rejecting reimbursement claims, by journalists writing about fraud cases, and by well-meaning friends and family trying to make sense of how someone intelligent and experienced could have sent their savings to a criminal.',
          'The statement is wrong on the evidence. Studies of confirmed APP fraud victims consistently find that they are not disproportionately less educated, less financially sophisticated, or less tech-savvy than the general population. What they are is human, with the same cognitive architecture that every human has, one that is genuinely vulnerable to specific types of social manipulation under specific conditions.',
        ],
      },
      {
        heading: 'Authority and legitimacy',
        paragraphs: [
          'The phone scam works because it activates compliance responses that are normally adaptive. When a person who sounds authoritative, knowledgeable, and urgent tells you that your account is under threat and you need to act immediately, the natural response is to take the threat seriously. This is not a cognitive flaw. It is the correct response in most situations where those signals appear.',
          'Fraudsters work hard to establish legitimate-sounding authority. They use caller ID spoofing to make calls appear to come from bank phone numbers. They have researched enough about the target to mention specific details that create an impression of insider knowledge. They use corporate language, reference real banking processes, and express what sounds like genuine concern for the victim\'s financial wellbeing. The performance is often indistinguishable from a real bank call, especially for customers who have rarely, if ever, been contacted by their bank about a fraud issue.',
        ],
      },
      {
        heading: 'Urgency and the narrowing of options',
        paragraphs: [
          'Once authority is established, the next tool is urgency. The victim is told that they have a very limited window to act. The fraud is happening now. If they do not move their money immediately, it will be too late. This urgency serves two purposes. It accelerates the victim toward compliance before they have time to think. And it prevents them from taking the natural protective action, which is to hang up and call their bank directly.',
          'Fraudsters specifically address this protective instinct. They tell victims not to call their bank on the other line because the bank\'s phones are also compromised. They tell them not to tell family members because the fraud investigation is confidential. They keep the victim on the phone throughout the transaction, providing a running commentary and pre-empting any doubts. The victim is essentially navigating entirely within a frame that the fraudster has constructed.',
          'Under these conditions, high-value payment decisions are being made by a person whose cognitive resources are allocated to managing anxiety, maintaining a real-time conversation, and following step-by-step instructions. The deliberative thinking system that would normally scrutinise a fifty-thousand-pound payment decision is simply not available. This is not a failure of character or intelligence. It is a predictable outcome of a well-designed attack on human cognition.',
        ],
      },
      {
        heading: 'Why warnings do not work the way we think they do',
        paragraphs: [
          'Banks have invested heavily in fraud warnings. Confirmation screens with large-font warnings about APP fraud, text messages asking customers to confirm they are not being pressured, and phone calls from fraud teams are all now part of standard practice at major UK and European banks. The evidence on their effectiveness is mixed at best.',
          'Part of the problem is timing. Warnings shown at the payment confirmation screen reach a customer who has already made their decision, at least psychologically. Changing course at that point would require admitting, at least to themselves, that they have been deceived, which is a difficult thing to do in real time. It would also mean disappointing or angering the authoritative figure on the phone, which the brain is strongly motivated to avoid.',
          'Warnings are also framed in ways that implicitly place responsibility on the customer, which activates defensiveness rather than openness. "Are you sure you know the recipient?" is a question that a victim who has been told the recipient is their own safe account will answer yes to, confidently.',
        ],
      },
      {
        heading: 'What actually reduces outcomes',
        paragraphs: [
          'The psychology literature on this suggests that the most effective interventions are ones that introduce a pause and a reframe before the victim commits. Not at the confirmation screen but earlier, when the behavioral signals that indicate the session is anomalous first appear. A call from a human agent who says "I notice you are making an unusually large transfer to a new payee. I am calling to make sure you initiated this yourself, with no one else on the phone" is a different kind of intervention than a warning screen. It breaks the frame rather than confirming it.',
          'This is expensive to do at scale. But it does not need to happen for every large payment, only for the payments where behavioral signals suggest the customer may be acting under instruction. Targeting the intervention is the point of the behavioral layer.',
        ],
      },
    ],
  },
  {
    slug: 'psd3-liability-shift',
    title: 'PSD3 and Liability Shift: What European Banks Need to Know Before 2027',
    subtitle: 'The next generation of payment regulation puts fraud prevention obligations squarely on banks. Behavioral monitoring is going from optional to essential.',
    author: 'Tomas Vrabel',
    authorRole: 'Regulatory Affairs',
    date: '2026-02-18',
    readMin: 6,
    category: 'Regulation',
    coverImage: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1200&q=80',
    sections: [
      {
        paragraphs: [
          'PSD3 entered trilogue negotiations in late 2024 and the final text is expected to be adopted in 2025, with a transposition window through 2027. For most banks, the operational implications of PSD3 are still being assessed. Many compliance teams are focused on the changes to open banking, the new rules around payment initiation service providers, and the updated strong authentication requirements.',
          'The APP fraud provisions deserve equal attention. They represent a meaningful shift in the liability framework that will affect how banks need to think about transaction monitoring, customer intervention, and their own exposure when fraud losses occur.',
        ],
      },
      {
        heading: 'What PSD3 actually says about APP fraud',
        paragraphs: [
          'PSD3 introduces, for the first time at the EU directive level, explicit requirements around what banks must do to protect customers from manipulation-based fraud. The key provision requires payment service providers to implement "measures proportionate to the risk" of a payment transaction, with particular reference to first-time payees, unusual amounts, and behavioral indicators of potential fraud.',
          'This language is deliberately broad, which means its practical interpretation will be worked out through regulatory guidance, enforcement action, and eventually case law. But the direction is clear. Banks will need to demonstrate that they assessed the risk of a transaction and took appropriate steps. Saying that the transaction was authenticated and therefore the bank had no further obligation is not going to be a sufficient defence under PSD3.',
        ],
      },
      {
        heading: 'The reimbursement obligation',
        paragraphs: [
          'PSD3 also moves toward mandatory reimbursement for APP fraud victims in cases where the bank failed to meet its monitoring obligations. The UK\'s mandatory reimbursement scheme, which came into force in October 2024 and requires banks to refund confirmed APP fraud victims up to a set limit, is the model being referenced in EU discussions.',
          'The practical effect is that fraud losses that were previously absorbed by customers will shift to banks. This changes the economics of fraud prevention investment significantly. A bank that spends on behavioral monitoring to prevent APP fraud is not just protecting customers; it is protecting its own balance sheet from reimbursement obligations it will have limited ability to contest.',
          'Estimates from UK banking data suggest that mandatory reimbursement costs at major institutions are running at a rate that would justify very substantial fraud prevention investment at standard ROI thresholds. The same economics will apply across the EU as PSD3 is implemented.',
        ],
      },
      {
        heading: 'Proportionality and the audit question',
        paragraphs: [
          'The proportionality requirement in PSD3 has an audit dimension that banks should be planning for now. When a fraud loss occurs and a customer seeks reimbursement, regulators will ask what risk assessment the bank performed before processing the payment and what controls it applied. Banks that can show a documented, systematic behavioral monitoring process will be in a better position than those that cannot.',
          'This creates an incentive structure that goes beyond simple fraud loss reduction. Even if a bank\'s behavioral monitoring does not catch every case, having a documented process that demonstrates proportionate risk assessment provides a degree of regulatory protection. The institutions that are building these capabilities now will have both the operational and the compliance advantage when PSD3 comes into full effect.',
        ],
      },
      {
        heading: 'Timing and what to do right now',
        paragraphs: [
          'The implementation timeline for PSD3 gives banks a window, but it is shorter than it looks. The directive will need to be transposed into national law, which introduces some variation between EU member states. But the core liability and monitoring requirements are likely to take effect in most major markets by late 2027. Given typical procurement, integration, and testing cycles for fraud prevention infrastructure, institutions that are not already evaluating behavioral monitoring solutions are running behind.',
          'The assessment process itself is valuable independent of timing. Understanding what behavioral signals your current system does and does not capture, what the coverage gaps are for your specific customer base, and what a proportionate intervention framework looks like for your risk appetite is preparation that pays off regardless of when the specific PSD3 requirements land.',
        ],
      },
    ],
  },
  {
    slug: 'remote-access-fraud',
    title: 'Remote Access Tools as Fraud Vectors: The Threat That Is Hiding in Plain Sight',
    subtitle: 'AnyDesk and TeamViewer were built for legitimate remote support. Fraudsters use them to take control of victims\' screens while pretending to help.',
    author: 'Kai Svensson',
    authorRole: 'Security Engineering',
    date: '2026-02-05',
    readMin: 5,
    category: 'Fraud Trends',
    coverImage: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80',
    sections: [
      {
        paragraphs: [
          'Remote access tools are legitimate software. TeamViewer, AnyDesk, and Chrome Remote Desktop are used by IT support teams around the world to troubleshoot computers, help colleagues with technical issues, and manage systems remotely. They are downloaded millions of times per year from official sources. They do exactly what they advertise.',
          'They are also among the most common tools used in large-scale APP fraud operations. The fraud is simple. A caller tells a victim that their computer has been compromised or that their banking app has a problem, and offers to help fix it remotely. They ask the victim to download a remote access tool and share a session code. Once connected, the fraudster has full control of the victim\'s screen.',
        ],
      },
      {
        heading: 'What the fraudster can see and do',
        paragraphs: [
          'Once a remote session is established, the fraudster has access to everything on the victim\'s screen in real time. They can watch the victim log into their banking app, read the account balances, see the authentication codes as they arrive by SMS, and guide the victim through making a transfer to a destination account.',
          'In some variants of the fraud, the fraudster actually takes control of the cursor and keyboard and makes the transaction themselves, while keeping the victim distracted or confused. In others, they provide verbal instructions and watch the victim do it, ready to intervene if the victim hesitates. In either case, the transaction appears entirely normal from the bank\'s perspective. The request is coming from the victim\'s device, from their location, with their credentials, and with their biometric authentication.',
          'The only unusual signal is a behavioral one: the session has characteristics that are inconsistent with how the victim normally interacts with their banking app. Navigation is either mechanical and precise in ways that suggest automation, or it follows an unusual path as the fraudster guides the victim through unfamiliar flows. Mouse movements may be unusually direct or show evidence of remote control latency.',
        ],
      },
      {
        heading: 'Why detection is harder than it looks',
        paragraphs: [
          'Detecting the presence of remote access tools on a device is technically possible but legally and operationally complicated. A bank\'s web or mobile application can, in principle, query device APIs for information about running processes. But this level of device inspection is considered intrusive by data protection regulators in most EU jurisdictions, and is likely to conflict with the privacy requirements that PSD3 and GDPR impose.',
          'Behavioral detection is more practical. A session where the mouse movements show the characteristic patterns of remote operation, specifically very straight lines, mechanical precision, and unusual speed consistency, is detectable without any device-level inspection. The behavioral signature of a person operating under instruction while someone watches their screen is also distinct: slower navigation, longer pauses at decision points, unusual patterns of reading and re-reading.',
          'This is not a perfect solution. Fraudsters adapt, and the more sophisticated ones are aware of behavioral monitoring and attempt to mimic natural behavior. But perfect detection is not the bar. Catching a meaningful proportion of remote-access-assisted fraud cases, the ones where the behavioral deviation is clear enough to justify intervention, significantly raises the cost and reduces the profitability of this fraud model.',
        ],
      },
      {
        heading: 'Industry response so far',
        paragraphs: [
          'A handful of UK and Australian banks have begun blocking or warning on transactions initiated during active remote access sessions, using device-level inspection within the scope of their terms of service. Early results suggest these interventions are catching a meaningful proportion of remote access fraud cases, though fraudsters have begun advising victims to disconnect the remote session before initiating the transfer, which defeats simple presence-detection approaches.',
          'The behavioral approach is more resilient to this because it reads the session history, not just the current device state. A session that shows the behavioral patterns of coached navigation does not become less suspicious because the remote access tool was closed five minutes before the transfer was submitted.',
        ],
      },
    ],
  },
  {
    slug: 'paste-and-pay-pattern',
    title: 'The Paste-and-Pay Pattern: A Fraud Signal Hidden in Plain Sight',
    subtitle: 'When someone pastes a bank account number instead of typing it, the probability of fraud goes up substantially. Most fraud systems are not measuring this at all.',
    author: 'Ingrid Hoffmann',
    authorRole: 'Product Research',
    date: '2026-01-22',
    readMin: 5,
    category: 'Technology',
    coverImage: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1200&q=80',
    sections: [
      {
        paragraphs: [
          'Think about how you enter a bank account number that you actually own. You type it character by character, probably slowly, probably with a few corrections. You have memorised it, or you are reading it from a card or a document, but either way the number goes in keystroke by keystroke. The dwell time between keys is uneven. There might be a backspace or two. The sequence takes several seconds.',
          'Now think about how a fraud victim enters a destination account number that was just read out to them by a caller, or sent to them in a text message or an email. In most cases, they copy the number from wherever it appeared and paste it into the field. Single keystroke. Instantaneous. Zero errors. The paste event is detectable at the browser level, and the behavioral contrast with typed entry is stark.',
        ],
      },
      {
        heading: 'Why paste behavior is a useful signal',
        paragraphs: [
          'Clipboard paste on account number fields is not automatically suspicious. People copy account numbers from confirmation emails when they are setting up legitimate standing orders. They paste from their own records when making recurring payments. There are genuine use cases for pasting.',
          'But the combination of signals around a paste event is what makes it interesting. A paste on a first-time payee field, combined with a high-value payment, combined with other session anomalies like elevated keystroke error rate and reduced scroll depth, produces a composite picture that is substantially more predictive than any individual signal.',
          'The statistical picture is clear in fraud case analysis. Payments where the destination account was pasted rather than typed have a meaningfully higher fraud rate than typed entries, controlling for payment value and payee familiarity. The fraudster provides the account number, the victim copies it, and the paste event is a trace of that handoff.',
        ],
      },
      {
        heading: 'What the research actually shows',
        paragraphs: [
          'Analysis of confirmed APP fraud cases shows that paste-heavy sessions, defined as sessions where the paste-to-type ratio for payment fields exceeds a certain threshold, are associated with fraud at a rate several times higher than typical sessions. This remains true even when controlling for the type of payment, the value, and the authentication method.',
          'The signal is not perfect. False positive rates depend heavily on the context. A person setting up multiple new payees from a spreadsheet will show high paste rates without any fraudulent intent. Legitimate business banking users routinely paste account details. But in a retail banking context, particularly for high-value consumer payments to personal accounts, the elevated paste rate is a signal that deserves attention.',
          'The practical implication is that monitoring clipboard behavior in payment flows requires almost no additional infrastructure, the browser events are already available, but it requires that someone decided to log and use them. Most fraud systems were built before this kind of fine-grained behavioral data was available, and have not been updated to incorporate it.',
        ],
      },
      {
        heading: 'How to use it responsibly',
        paragraphs: [
          'Paste behavior should be used as one input into a composite risk score, not as a standalone trigger. Blocking or challenging every pasted account number would create an unacceptable false positive rate and irritate the majority of customers who paste for entirely legitimate reasons. The signal gains its power through combination with other behavioral and contextual factors.',
          'A risk model that uses paste behavior as one of eight or ten behavioral inputs, weighted appropriately for the transaction context, can surface the cases where the combination of signals is strong enough to justify a friction event. The customer who pastes an account number, has not made this payment before, is doing it for an unusually large amount, and shows several other anomalous behavioral signals is a very different risk profile from the customer who pastes an account number while setting up a direct debit.',
        ],
      },
    ],
  },
  {
    slug: 'rule-based-fraud-losing',
    title: 'Why Rule-Based Fraud Systems Are Losing the Battle Against APP Scams',
    subtitle: 'Fraud teams spent a decade building sophisticated rule engines. Those rules are excellent at detecting the fraud of five years ago. Modern APP scams route around them by design.',
    author: 'Kai Svensson',
    authorRole: 'Security Engineering',
    date: '2026-01-08',
    readMin: 6,
    category: 'Technology',
    coverImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
    sections: [
      {
        paragraphs: [
          'The fraud rule engine at a large European bank is an impressive piece of infrastructure. It evaluates thousands of variables per transaction: the amount, the beneficiary, the time of day, the device, the location, the account age, the transaction history, the velocity of recent payments, and dozens more. It runs in milliseconds. It has been tuned by experienced fraud analysts over years of iteration. And for the fraud categories it was designed to catch, it works extremely well.',
          'The problem is that the fraud categories it was designed to catch are largely not the ones that are growing. Card fraud, account takeover, and synthetic identity fraud are all being controlled reasonably well by rule-based systems, machine learning models, and authentication improvements. The fraud that is growing, APP scams driven by social engineering, does not behave the way the rules are written to detect.',
        ],
      },
      {
        heading: 'How the rules work and why APP fraud avoids them',
        paragraphs: [
          'Most transaction fraud rules are built around the concept of anomaly at the transaction level. A payment is suspicious if it is unusually large relative to the customer\'s history, if it goes to a destination associated with fraud, if it follows an unusual velocity pattern, or if it is made from an unrecognised device or location. These rules are grounded in good statistical analysis of historical fraud data and they correctly flag many risky transactions.',
          'APP fraud operations are specifically designed to avoid these triggers. The fraudster does research on the target\'s likely transaction history before making the call. They construct a narrative that gives a plausible explanation for the unusual payment: it is an emergency, it is a time-limited opportunity, it is required to protect the account. They often stage the transfer as multiple smaller payments over several days, each individually below thresholds that would trigger review. They use destination accounts that have been "money muled" through legitimate-looking channels to avoid blacklist matches.',
          'The result is a fraud pattern that looks, at the transaction level, like a reasonable payment. The amount may be unusual but within range. The destination is a new payee but that is common. The timing is not specifically abnormal. Each individual data point says nothing alarming. The fraud is only visible in the aggregate of the session behavior.',
        ],
      },
      {
        heading: 'The arms race problem',
        paragraphs: [
          'Rule-based systems face a structural problem in fraud prevention: they can only catch patterns that have already been observed. Each new rule is written in response to a fraud pattern that has already been used successfully enough to show up in the data. By the time a rule is written, tested, deployed, and tuned, the fraud operation it was designed to catch has usually moved on.',
          'This is not a criticism of fraud analysts. It is a description of a structural limitation of rule-based approaches in any adversarial context. The rules are always backward-looking. The fraudsters are always forward-looking. In a slowly-evolving threat environment, this lag is manageable. In an environment where sophisticated criminal operations are continuously testing and adapting their methods, the lag is a significant vulnerability.',
        ],
      },
      {
        heading: 'What machine learning adds and where it falls short',
        paragraphs: [
          'Machine learning fraud models were introduced to address some of the limitations of hand-written rules. Rather than requiring an analyst to specify which patterns indicate fraud, a trained model learns the statistical features of fraudulent versus legitimate transactions from historical data. This allows it to detect patterns that are too complex or too subtle to specify explicitly.',
          'For transaction-level fraud, ML models are significantly better than pure rule systems. But for APP fraud, they face the same fundamental constraint: they are trained on the observable features of past fraud cases, which were partly successful because they are hard to distinguish from legitimate transactions at the transaction level. The model learns the distribution of past fraud, not the distribution of future fraud that has been specifically designed to look legitimate.',
          'What is missing from both rules and transaction-level ML is the session-level behavioral context. The question is not just whether this payment is unusual. The question is whether this person is behaving normally. That requires a different kind of data and a different kind of model.',
        ],
      },
      {
        heading: 'Combining approaches',
        paragraphs: [
          'The most effective fraud prevention architecture combines transaction-level signals, where rule engines and ML models are already strong, with session-level behavioral signals, where most systems have coverage gaps. Neither approach is sufficient alone. A behavioral anomaly in a low-value, known-payee transaction is probably noise. A clean behavioral session on a high-value first-time payment to a destination on a watchlist is probably fine. It is the combination of multiple elevated signals, across different layers, that identifies the cases worth intervening on.',
          'This is not a particularly controversial view in the fraud prevention industry. Most practitioners agree in principle. The practical barrier is that session behavioral data is not collected or used by most existing fraud infrastructure, and integrating it requires changes to data pipelines, model architecture, and operational workflows that take time and money. The institutions that are making these changes now will be in a substantially better position than those waiting for a more convenient moment.',
        ],
      },
    ],
  },
  {
    slug: 'silent-friction',
    title: 'Silent Friction: How to Protect Customers Without Ruining Their Experience',
    subtitle: 'Every fraud prevention intervention has a false positive rate. The question is not whether to add friction but when to add it, for whom, and in what form.',
    author: 'Marta Lindqvist',
    authorRole: 'Head of Fraud Research',
    date: '2025-12-18',
    readMin: 6,
    category: 'Product',
    coverImage: 'https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=1200&q=80',
    sections: [
      {
        paragraphs: [
          'The standard framing of fraud prevention versus customer experience is adversarial. Adding security measures creates friction. Friction reduces conversion. Therefore more security means worse customer experience. This framing is accurate as far as it goes, but it is incomplete, and the incompleteness matters enormously for how you design a fraud prevention system.',
          'A more precise framing would be: indiscriminate friction reduces customer experience. Targeted friction, applied to the sessions that are actually risky, applied in forms that match the level of risk and the nature of the suspected threat, does not need to significantly harm the experience of the customers who are not at risk. The problem with most friction strategies is not that they add security steps. It is that they add them for everyone, which is the same as adding them for the majority of customers who are not in the middle of a fraud attempt.',
        ],
      },
      {
        heading: 'What indiscriminate friction costs',
        paragraphs: [
          'A bank that requires a confirmation call for every payment above ten thousand pounds will catch some fraud and will also annoy a large number of legitimate customers who are making perfectly normal large payments. Some of those customers will abandon the payment and try again later, which is an inconvenience. Some will switch to a competitor with a smoother process. Some will escalate complaints. The fraud prevention benefit has to be weighed against these real costs.',
          'Transaction value thresholds, new payee warnings, and device confirmation steps all have the same property: they apply to a category of transactions, not to the specific transactions that are risky within that category. The result is that a very large number of legitimate transactions get interrupted for the sake of catching a small number of fraudulent ones.',
          'This does not mean the interventions are wrong. For a bank with no behavioral monitoring capability, value thresholds and new payee warnings are a reasonable second-best approach. But treating them as a ceiling rather than a floor, as the primary defence rather than a fallback, means accepting a permanently poor tradeoff between fraud reduction and customer experience.',
        ],
      },
      {
        heading: 'Targeted friction and how it works',
        paragraphs: [
          'Targeted friction takes a different approach. Rather than asking whether a transaction belongs to a high-risk category, it asks whether this specific session shows evidence of elevated risk. The intervention is triggered not by the payment amount but by the behavioral composite score for this customer, in this session, for this specific payment.',
          'A customer who has made large payments before, who is navigating normally, whose keystroke patterns match their historical baseline, and whose session shows no signs of external influence gets a smooth experience even for a fifty-thousand-pound transfer to a new payee. A customer who is making their first large payment, is showing elevated error rates and paste activity, is spending an unusually short time reading the confirmation screen, and whose session navigation has the linear quality of someone following verbal instructions gets a call from the fraud team before the payment processes.',
          'The second customer is real. The first customer is the majority. Targeting the intervention dramatically reduces the false positive rate without reducing the fraud catch rate, because the detection signal is more specific.',
        ],
      },
      {
        heading: 'The form of the intervention matters',
        paragraphs: [
          'Not all friction is equal. A screen that says "Warning: You may be being scammed" requires the customer to process and act on a warning while they are potentially in the middle of a psychological attack designed to make them ignore warnings. Research on warning screen effectiveness consistently shows that customers in APP fraud situations frequently dismiss or override these warnings.',
          'A phone call from a human agent who says "I\'m calling from your bank\'s fraud team. I want to make sure you initiated this transfer yourself, with no one else on the line" is a different kind of intervention. It breaks the frame of the fraud scenario rather than fitting into it. It is more expensive to deliver, which is why targeting matters: you cannot afford to make this call for every large payment, but you can make it for the small number of sessions where the behavioral evidence suggests it is warranted.',
        ],
      },
    ],
  },
  {
    slug: 'fraud-session-behavioral-breakdown',
    title: 'What a Typical Fraud Session Looks Like: A Behavioral Breakdown',
    subtitle: 'Reconstructing the behavioral timeline of a confirmed APP fraud case shows exactly where the signals were, how strong they were, and what a system should have done differently.',
    author: 'Ingrid Hoffmann',
    authorRole: 'Product Research',
    date: '2025-12-04',
    readMin: 8,
    category: 'Security Research',
    coverImage: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    sections: [
      {
        paragraphs: [
          'The following is a composite case reconstructed from anonymised fraud case files provided by a UK retail bank. It represents a pattern we have seen repeated with minor variations across several hundred confirmed APP fraud cases. The names and specific details have been changed. The behavioral data reflects real signal distributions from actual sessions.',
          'The customer, a 58-year-old professional who we will call Daniel, received a call on a Tuesday afternoon from someone claiming to be from his bank\'s fraud team. The caller told Daniel that an unusual payment attempt had been flagged on his account and that his money was at risk. The call lasted 47 minutes. During the final 18 minutes, Daniel logged into his banking app and transferred his entire savings balance to what the caller told him was a temporary safe account.',
        ],
      },
      {
        heading: 'Session entry: the first signals',
        paragraphs: [
          'Daniel\'s banking app session began at 14:23 on a device and network he used regularly. Authentication was normal: his PIN entered correctly on the first attempt, his biometric verified immediately. From the perspective of every system that checks identity, this session was indistinguishable from any of his previous sessions.',
          'The first behavioral signal appeared within 90 seconds of login. Daniel navigated directly to the payment initiation screen without visiting his account overview or transaction history, which was his consistent historical pattern before making payments. Normally, Daniel spent an average of 40 seconds on his account summary before initiating any outbound transfer. On this session, he went straight to new payee setup. This single deviation scored low individually but would later form part of a composite signal.',
        ],
      },
      {
        heading: 'The new payee entry',
        paragraphs: [
          'Daniel entered the beneficiary account details over about 90 seconds. The sort code was pasted, confirmed by a paste event at 14:25:14. The account number was also pasted, 6 seconds later. Daniel\'s historical behavior on the small number of previous new payee setups showed typed entry for all fields. The switch to paste-only entry for both fields was a significant deviation.',
          'The account name field was typed, slowly, with two correction events. This is consistent with someone reading text from a screen or writing it down while a caller dictates it. The keystroke error rate on the account name field was 0.31, compared to Daniel\'s historical average of 0.06. Elevated error rates on a specific field, combined with correction patterns, are a reliable signal of stressed or distracted data entry.',
          'At this point, the composite behavioral score was already in the elevated range. Anomalous navigation, paste entry on both sensitive fields, and elevated error rate on the beneficiary name. No single signal was definitive but the combination was strong.',
        ],
      },
      {
        heading: 'The confirmation screen',
        paragraphs: [
          'Daniel\'s time on the payment confirmation screen was 7 seconds. His historical average on confirmation screens for high-value payments was 28 seconds, and on two previous occasions where he had transferred amounts above ten thousand pounds, he had returned to the previous screen at least once before confirming. On this session, he spent 7 seconds on the confirmation screen and approved immediately.',
          'The scroll depth on the confirmation screen was 0.0, meaning he did not scroll at all. The confirmation screen on this bank\'s app contains, in the lower portion of the screen, a fraud warning specifically mentioning APP scam scenarios. Daniel did not scroll to see it.',
          'The composite behavioral score at the point of payment confirmation was in the high risk band. The session showed five distinct behavioral anomalies, each moderate in isolation, that together presented a clear signature of a customer acting under instruction rather than of their own volition.',
        ],
      },
      {
        heading: 'What happened and what should have happened',
        paragraphs: [
          'Daniel\'s payment was processed. The behavioral data was recorded but was not connected to a real-time intervention system. The session was reviewed by the bank\'s fraud team approximately 19 hours later as part of a batch review process, by which point the funds had passed through two further accounts and been largely withdrawn.',
          'A real-time behavioral monitoring system, had one been in place, would have flagged this session before the payment was submitted. The composite score exceeded the threshold for a soft intervention, specifically an automated hold and a phone call from the fraud team, with 90 seconds of the payment confirmation event. At that point, the money was still in Daniel\'s account. The caller would presumably have told Daniel that the call was fake, part of the ongoing fraud. But a human agent asking specific questions about who else was on the line, whether the destination account belonged to Daniel, and whether the transfer had been requested by a third party would have had a high probability of breaking the fraud scenario.',
          'This case is not unusual. It is representative. The behavioral signals were there. The detection capability was not. Building that capability, specifically the real-time composite scoring and the operational workflow to act on it, is the infrastructure gap that the fraud industry needs to close.',
        ],
      },
    ],
  },
];
