let gpuData = [];

let selectedGPU = "";

// Load GPU data from a json file
fetch("dataset/gpuData.json")
  .then(res => res.json())
  .then(data => {
    gpuData = data;
  });

async function bootServer() {
    let prompt = "this is a message just to ensure the backend server is booted! Please answer with 'yes' if you recieve this";

    const response = await fetch("https://secure-api-proxy.onrender.com/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
    });

    console.log(response);
}

async function askGemini() {
    document.getElementById("confirmButton").style.display = 'none';
    document.getElementById("loadingText").style.display = 'block';

    //Getting inputs from website
    const usageInput = document.getElementById("usageInput").value;
    const programsInput = document.getElementById("programsInput").value;
    const companyInput = document.getElementById("companyInput").value;
    const budgetInput = document.getElementById("budgetInput").value;

    //Make context for gemini based on the dataset of gpus
    let context = "Here is a list of GPU information:\n";
    gpuData.forEach(gpu => {
        context += `Name: ${gpu.Name}\nMemory: ${gpu.Memory}\nCompany: ${gpu.Company}\nPerformance: ${gpu.Performance}\nRelease Date: ${gpu.Date}\nPrice: ${gpu.Price}\n\n`;
    });

    //Make the prompt
    let prompt = `${context}\nHere are the user's preferences:\n`;

    //Checke each input box if its empty and add a message accordingly
    if(usageInput.trim() === ""){
        prompt += `Usage preference: I have no preference when it comes to the general usage of the gpu,\n`;
    }
    else{
        prompt += `Usage preference: ${usageInput}\n`;
    }

    if(programsInput.trim() === ""){
        prompt += `Performance Expectations: I have no expectances when it comes to performance,\n`;
    }
    else{
        prompt += `Performance Expectations: ${programsInput}\n`;
    }

    if(companyInput.trim() === ""){
        prompt += `Preferred company: I have no preference when it comes to the manufacturer/company of the gpu,\n`;
    }
    else{
        prompt += `Preferred company: ${companyInput}\n`;
    }

    if(budgetInput.trim() === ""){
        prompt += `Budget: I have no budget restrictions in mind,\n`;
    }
    else{
        prompt += `Budget: ${budgetInput}\n`;
    }

    prompt += `--If one of these preferences is not connected to GPUs and the preference then ignore it completely and assume the user has no preferences for that section-- 
    \nBased on these preferences and ONLY the list of GPUs given, which GPU would you recommend, 
    the best GPU that satisfies the preferences without exceeding the budget (if specified), mention the name of the gpu exactly how it appears in the given dataset, 
    give me one single small sentence that has only 1 gpu recommendation and explain why this option suits the user briefly in a conversational way, do not sound robotic`;

    //Call gemini API and get a response
    const response = await fetch("https://secure-api-proxy.onrender.com/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
    });

    //Parse the response into a valid output
    const result = await response.json();
    const answer = result.candidates[0].content.parts[0].text;

    document.getElementById("finalRec").innerText = answer;

    selectedGPU = getGPU(answer);
    console.log(selectedGPU.Name);

    //Make an output message for the specs of the gpu recommended
    const specs = `${selectedGPU.Name} Specifications:\nRelease Date: ${selectedGPU.Date}\nCompany: ${selectedGPU.Company}\nMemory: ${selectedGPU.Memory}\nAverage Price: ${selectedGPU.Price}\nPerformance Overview: ${selectedGPU.Performance}`;

    document.getElementById("specs").innerText = specs;

    document.getElementById("3dModel").src = `models/${selectedGPU.Name}.glb`;

    // Hide Page 1 and show Page 2
    document.getElementById("page1").classList.remove("visible");
    document.getElementById("page2").classList.add("visible");
    document.getElementById("page1").classList.add("hidden");
    document.getElementById("page2").classList.remove("hidden");
    
}

function getGPU(answer){
    //Go through the gpu list to check if its mentioned in the output
    for(let gpu of gpuData){
        if(answer.toLowerCase().includes(gpu.Name.toLowerCase())){
            return gpu;
        }
    }

    return "Unknown GPU"; //Return unknown if the gpu wasnt found
}
