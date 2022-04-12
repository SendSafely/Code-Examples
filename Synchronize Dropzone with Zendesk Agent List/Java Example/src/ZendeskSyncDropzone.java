import com.sendsafely.SendSafely;
import com.sendsafely.exceptions.*;
import org.zendesk.client.v2.model.*;
import org.zendesk.client.v2.*;
import java.util.*;

public class ZendeskSyncDropzone {
	
	public static void main(String[] args) throws LimitExceededException, GetPackagesException, RecipientFailedException, PackageInformationFailedException
	{
		boolean previewOnly = true;	
		//Initialize ZD API and pull the list of active users  
	        Zendesk zd = new Zendesk.Builder("https://company.zendesk.com")
                .setUsername("support@companyabc.com")
                .setPassword("PUT_PASSWORD_HERE") // or use .setToken("...")
                .build();

		HashSet<String> zdUsers = new HashSet<String>();
		for (User user : zd.getUsersByRole("admin")) 
		{
			zdUsers.add(user.getEmail().toLowerCase());
		}

		for (User user : zd.getUsersByRole("agent")) 
		{
			zdUsers.add(user.getEmail().toLowerCase());
		}

		//Initialize SendSafely API
		SendSafely sendSafely = new SendSafely("https://app.sendsafely.com", "PUT_API_KEY_HERE", "PUT_API_SECRET_HERE");
           
		ArrayList<String> ssRecipients = new ArrayList<String>();
		
		//Loop through each recipient and make sure they are in Zendesk 
		List<String> dropzoneRecipients = sendSafely.getDropzoneRecipient();
		for (Iterator<String> dropzoneIterator = dropzoneRecipients.iterator(); dropzoneIterator.hasNext(); )
		{
			String recip = dropzoneIterator.next();
			ssRecipients.add(recip.toLowerCase());
			if (! zdUsers.contains(recip.toLowerCase()))
			{
				System.out.println(recip.toLowerCase() + " is not in Zendesk. Removing them.");
				if (! previewOnly)
				{
					sendSafely.removeDropzoneRecipient(recip);
				}
			}
		}

		//Loop through each Zendesk user and make sure they are a recipient 
		for (String zdEmail : zdUsers)
		{
			if (! ssRecipients.contains(zdEmail.toLowerCase()))
			{
				System.out.println(zdEmail.toLowerCase() + " is not a recipient. Adding them.");
				try
				{
					if (! previewOnly)
					{
						sendSafely.addDropzoneRecipient(zdEmail);
					}
				}
				catch(Exception e){
					System.out.println(e.getMessage());
				}
				
			}
		}
			
	}
}
